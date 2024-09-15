import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
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
} from '@taskfusion-microservices/entities';
import { Repository } from 'typeorm';
import { ProjectsService } from '../../projects/projects.service';
import { CustomAmqpConnection } from '@taskfusion-microservices/common';

@Injectable()
export class InvitesService {
  constructor(
    @InjectRepository(DeveloperInviteEntity)
    private readonly developerInviteEntityRepositoty: Repository<DeveloperInviteEntity>,

    @InjectRepository(PmInviteEntity)
    readonly pmInviteEntityRepositoty: Repository<PmInviteEntity>,

    private readonly projectsService: ProjectsService,

    private readonly customAmqpConnection: CustomAmqpConnection
  ) {}
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

    const inviteLink =
      invitedUserType === UserType.PM
        ? `http://localhost:8000/pm/project-invitation/${inviteId}`
        : `http://localhost:8000/developer/project-invitation/${inviteId}`;

    await this.customAmqpConnection.publishOrThrow(
      SendEmailContract.routingKey,
      {
        recipientEmail,
        subject: 'Project Invitation from TaskFusion',
        message: `
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
        `,
      } as SendEmailContract.Dto
    );
  }

  async validateProjectClient(project: ProjectEntity, clientUserId: number) {
    if (!project || project.clientId !== clientUserId) {
      throw new BadRequestException('Project not found');
    }

    return project;
  }

  async validateProjectPm(project: ProjectEntity, pmUserId: number) {
    const payload: GetProjectPmIdContract.Dto = {
      projectId: project.id,
    };

    const result =
      await this.customAmqpConnection.requestOrThrow<GetProjectPmIdContract.Response>(
        GetProjectPmIdContract.routingKey,
        payload
      );

    const { pmUserId: projectPmUserId } = result;

    if (!projectPmUserId || projectPmUserId !== pmUserId) {
      throw new BadRequestException('Project not found');
    }
  }

  async getProjectById(id: number) {
    return this.projectsService.getProjectByIdRpcHandler({ projectId: id });
  }

  async getUserByEmail(email: string, expectedUserType: UserType) {
    const payload: GetUserByEmailContract.Dto = {
      email,
    };

    const user =
      await this.customAmqpConnection.requestOrThrow<GetUserByEmailContract.Response>(
        GetUserByEmailContract.routingKey,
        payload
      );

    if (!user || user.userType !== expectedUserType) {
      throw new Error(`${expectedUserType} user not found`);
    }

    return user;
  }

  async getUserById(id: number, expectedUserType: UserType) {
    const payload: GetUserByIdContract.Dto = {
      id,
    };

    const user =
      await this.customAmqpConnection.requestOrThrow<GetUserByIdContract.Response>(
        GetUserByIdContract.routingKey,
        payload
      );

    if (!user || user.userType !== expectedUserType) {
      throw new Error(`${expectedUserType} user not found`);
    }

    return user;
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

    if (!clientUser || clientUser.userType !== UserType.CLIENT) {
      throw new Error('Client user not found');
    }
    return clientUser;
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
        throw new Error('Invite already accepted');

      case InviteStatus.REJECTED:
        throw new Error('Invite already rejected');

      case InviteStatus.PENDING:
        if (this.isPmInviteActive(existingInvite)) {
          throw new Error('Active invite already exists');
        }

        await this.pmInviteEntityRepositoty.update(
          { id: existingInvite.id },
          { expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24) } // 1 day
        );

        this.sendInvitationEmail({
          recipientEmail: pmUser.email,
          title: 'Project Invitation from TaskFusion',
          inviterName: clientUser.name,
          inviterEmail: clientUser.email,
          inviteId: existingInvite.id,
          invitedUserType: UserType.PM,
        });

        return { id: existingInvite.id };

      default:
        throw new Error('Unhandled invite status');
    }
  }

  async handleExistingDeveloperInvite(
    existingInvite: DeveloperInviteEntity,
    developerUser: UserEntity,
    pmUser: UserEntity
  ) {
    switch (existingInvite.inviteStatus) {
      case InviteStatus.ACCEPTED:
        throw new Error('Invite already accepted');

      case InviteStatus.REJECTED:
        throw new Error('Invite already rejected');

      case InviteStatus.PENDING:
        if (this.isDeveloperInviteActive(existingInvite)) {
          throw new Error('Active invite already exists');
        }

        await this.developerInviteEntityRepositoty.update(
          { id: existingInvite.id },
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

      default:
        throw new Error('Unhandled invite status');
    }
  }

  async checkIfUserExists(userId: number) {
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
}
