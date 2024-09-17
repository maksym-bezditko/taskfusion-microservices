import {
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  AssignUserToProjectContract,
  CheckUserContract,
  GetProjectPmIdContract,
  GetUserByEmailContract,
  GetUserByIdContract,
  SendEmailContract,
} from '@taskfusion-microservices/contracts';
import {
  PmInviteEntity,
  DeveloperInviteEntity,
  InviteStatus,
  UserType,
  ProjectEntity,
  UserEntity,
  ProjectParticipantRole,
} from '@taskfusion-microservices/entities';
import { DeepPartial, Repository } from 'typeorm';
import { ProjectsService } from '../../projects/projects.service';
import { CustomAmqpConnection } from '@taskfusion-microservices/common';

@Injectable()
export class InvitesService {
  private readonly logger = new Logger(InvitesService.name);

  constructor(
    @InjectRepository(DeveloperInviteEntity)
    private readonly developerInviteEntityRepositoty: Repository<DeveloperInviteEntity>,
    @InjectRepository(PmInviteEntity)
    readonly pmInviteEntityRepositoty: Repository<PmInviteEntity>,
    private readonly projectsService: ProjectsService,
    private readonly customAmqpConnection: CustomAmqpConnection
  ) {}

  async sendInvitationEmail(params: {
    recipientEmail: string;
    title: string;
    inviterName: string;
    inviterEmail: string;
    inviteId: number;
    invitedUserType: UserType;
  }) {
    const {
      recipientEmail,
      title,
      inviterName,
      inviterEmail,
      inviteId,
      invitedUserType,
    } = params;

    const inviteLink = await this.getInviteLinkByUserType(
      invitedUserType,
      inviteId
    );

    const messageHTML = await this.formInviteMessageHTML({
      title,
      inviterName,
      inviterEmail,
      inviteLink,
    });

    await this.customAmqpConnection.publishOrThrow(
      SendEmailContract.routingKey,
      {
        recipientEmail,
        subject: 'Project Invitation from TaskFusion',
        message: messageHTML,
      } as SendEmailContract.Dto
    );

    this.logger.log(
      `Invitation email sent to ${recipientEmail} with invite link ${inviteLink}`
    );
  }

  private async getInviteLinkByUserType(userType: UserType, inviteId: number) {
    if (userType === UserType.PM) {
      return `http://localhost:8000/pm/project-invitation/${inviteId}`;
    }

    return `http://localhost:8000/developer/project-invitation/${inviteId}`;
  }

  private async formInviteMessageHTML(info: {
    title: string;
    inviterName: string;
    inviterEmail: string;
    inviteLink: string;
  }) {
    const { title, inviterName, inviterEmail, inviteLink } = info;

    return `
      <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
        <h2 style="color: #4CAF50; text-align: center;">Project Invitation</h2>
        <p>Hi,</p>
        <p>You have been invited to join the project <strong>${title}</strong> by <strong>${inviterName}</strong> (${inviterEmail}).</p>
        <p style="text-align: center;">
          <a href="${inviteLink}"
            style="display: inline-block; padding: 10px 20px; color: white; background-color: #4CAF50; border-radius: 5px; text-decoration: none; font-weight: bold;">
            Accept Invitation
          </a>
        </p>
        <p>If the button above doesn’t work, please click on the link below or copy and paste it into your browser:</p>
        <p style="word-break: break-all;">
          <a href="${inviteLink}" style="color: #4CAF50;">
            ${inviteLink}
          </a>
        </p>
        <p>Thank you!</p>
      </div>
    `;
  }

  async getProjectPmId(projectId: number) {
    const payload: GetProjectPmIdContract.Dto = {
      projectId,
    };

    const result =
      await this.customAmqpConnection.requestOrThrow<GetProjectPmIdContract.Response>(
        GetProjectPmIdContract.routingKey,
        payload
      );

    const { pmUserId: projectPmUserId } = result;

    return projectPmUserId;
  }

  async getProjectByIdOrThrow(projectId: number) {
    return this.projectsService.getProjectByIdOrThrow(projectId);
  }

  async getProjectById(projectId: number) {
    return this.projectsService.getProjectById(projectId);
  }

  async getUserByEmail(email: string) {
    const payload: GetUserByEmailContract.Dto = {
      email,
    };

    const user =
      await this.customAmqpConnection.requestOrThrow<GetUserByEmailContract.Response>(
        GetUserByEmailContract.routingKey,
        payload
      );

    return user;
  }

  async getUserByEmailOrThrow(email: string) {
    const user = await this.getUserByEmail(email);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async getUserById(id: number) {
    const payload: GetUserByIdContract.Dto = {
      id,
    };

    const user =
      await this.customAmqpConnection.requestOrThrow<GetUserByIdContract.Response>(
        GetUserByIdContract.routingKey,
        payload
      );

    return user;
  }

  async getClientUserByIdOrThrow(clientUserId: number) {
    const clientUser = await this.getClientUserById(clientUserId);

    if (!clientUser) {
      throw new NotFoundException('Client user not found');
    }

    return clientUser;
  }

  async getClientUserById(clientUserId: number) {
    const payload: GetUserByIdContract.Dto = {
      id: clientUserId,
    };

    const clientUser =
      await this.customAmqpConnection.requestOrThrow<GetUserByIdContract.Response>(
        GetUserByIdContract.routingKey,
        payload
      );

    return clientUser;
  }

  async throwIfUserTypeDoesNotMatch(
    user: UserEntity,
    expectedUserType: UserType
  ) {
    if (!user || user.userType !== expectedUserType) {
      throw new Error(`${expectedUserType} user not found`);
    }

    return user;
  }

  async createPmInvite(
    clientUserId: number,
    pmUserId: number,
    project: ProjectEntity
  ) {
    return this.pmInviteEntityRepositoty.save({
      clientUserId,
      pmUserId,
      project,
      isActive: true,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24), // 1 day
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  async createDeveloperInvite(
    pmUserId: number,
    developerUserId: number,
    project: ProjectEntity
  ) {
    return this.developerInviteEntityRepositoty.save({
      developerUserId,
      pmUserId,
      project,
      isActive: true,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24), // 1 day
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  async handleExistingPmInvite(
    existingInvite: PmInviteEntity,
    pmUser: UserEntity,
    clientUser: UserEntity
  ) {
    switch (existingInvite.inviteStatus) {
      case InviteStatus.ACCEPTED:
        return this.logAndThrowError('Invite already accepted');

      case InviteStatus.REJECTED:
        return this.logAndThrowError('Invite already rejected');

      case InviteStatus.PENDING:
        return this.handlePendingExistingPmInvite(
          existingInvite,
          pmUser,
          clientUser
        );

      default:
        return this.logAndThrowError('Unhandled invite status');
    }
  }

  private async handlePendingExistingPmInvite(
    existingInvite: PmInviteEntity,
    pmUser: UserEntity,
    clientUser: UserEntity
  ) {
    if (this.isPmInviteActive(existingInvite)) {
      this.logAndThrowError('Active invite already exists');
    }

    await this.updatePmInvite(existingInvite, {
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24), // 1 day
    });

    this.sendInvitationEmail({
      recipientEmail: pmUser.email,
      title: 'Project Invitation from TaskFusion',
      inviterName: clientUser.name,
      inviterEmail: clientUser.email,
      inviteId: existingInvite.id,
      invitedUserType: UserType.PM,
    });

    return { id: existingInvite.id };
  }

  private logAndThrowError(error: string | Error): never {
    if (typeof error === 'string') {
      this.logger.error(error);
      throw new Error(error);
    }

    if (error instanceof Error) {
      this.logger.error(error.message || 'Unknown error', error.stack);
      throw error;
    }

    this.logger.error('Unknown error');
    throw new Error('Unknown error');
  }

  private async updatePmInvite(
    existingInvite: PmInviteEntity,
    updatedFields: DeepPartial<PmInviteEntity>
  ) {
    return this.pmInviteEntityRepositoty.update(existingInvite, updatedFields);
  }

  async handleExistingDeveloperInvite(
    existingInvite: DeveloperInviteEntity,
    developerUser: UserEntity,
    pmUser: UserEntity
  ) {
    switch (existingInvite.inviteStatus) {
      case InviteStatus.ACCEPTED:
        return this.logAndThrowError('Invite already accepted');

      case InviteStatus.REJECTED:
        return this.logAndThrowError('Invite already rejected');

      case InviteStatus.PENDING:
        return this.handlePendingExistingDeveloperInvite(
          existingInvite,
          pmUser,
          developerUser
        );

      default:
        return this.logAndThrowError('Unhandled invite status');
    }
  }

  private async handlePendingExistingDeveloperInvite(
    existingInvite: DeveloperInviteEntity,
    pmUser: UserEntity,
    developerUser: UserEntity
  ) {
    if (this.isDeveloperInviteActive(existingInvite)) {
      this.logAndThrowError('Active invite already exists');
    }

    await this.updateDeveloperInvite(
      existingInvite,
      { expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24) } // 1 day
    );

    this.sendInvitationEmail({
      recipientEmail: developerUser.email,
      title: 'Project Invitation from TaskFusion',
      inviterName: pmUser.name,
      inviterEmail: pmUser.email,
      inviteId: existingInvite.id,
      invitedUserType: UserType.DEVELOPER,
    });

    return { id: existingInvite.id };
  }

  private async updateDeveloperInvite(
    existingInvite: DeveloperInviteEntity,
    updatedFields: DeepPartial<DeveloperInviteEntity>
  ) {
    return this.pmInviteEntityRepositoty.update(existingInvite, updatedFields);
  }

  async throwIfUserDoesNotExist(userId: number) {
    const payload: CheckUserContract.Dto = {
      userId,
    };

    const user =
      await this.customAmqpConnection.requestOrThrow<CheckUserContract.Response>(
        CheckUserContract.routingKey,
        payload
      );

    if (!user || !user.exists) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async assignUserToProject(
    projectId: number,
    userId: number,
    role: ProjectParticipantRole
  ) {
    const payload: AssignUserToProjectContract.Dto = {
      projectId,
      userId,
      role,
    };

    return this.customAmqpConnection.requestOrThrow<AssignUserToProjectContract.Response>(
      AssignUserToProjectContract.routingKey,
      payload
    );
  }

  isPmInviteActive(invite: PmInviteEntity) {
    return (
      new Date(invite.expiresAt) > new Date() &&
      invite.pmUserId === invite.pmUserId &&
      invite.inviteStatus === InviteStatus.PENDING
    );
  }

  isDeveloperInviteActive(invite: DeveloperInviteEntity) {
    return (
      new Date(invite.expiresAt) > new Date() &&
      invite.developerUserId === invite.developerUserId &&
      invite.inviteStatus === InviteStatus.PENDING
    );
  }
}
