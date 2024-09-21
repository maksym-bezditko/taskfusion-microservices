import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AssignUserToProjectContract,
  CheckUserContract,
  GetUserByEmailContract,
  GetUserByIdContract,
  SendEmailContract,
} from '@taskfusion-microservices/contracts';
import {
  UserType,
  UserEntity,
  ProjectParticipantRole,
} from '@taskfusion-microservices/entities';
import { ProjectsService } from '../../projects/projects.service';
import { BaseService, CustomAmqpConnection } from '@taskfusion-microservices/common';

@Injectable()
export class InvitesHelperService extends BaseService {
  constructor(
    private readonly projectsService: ProjectsService,
    private readonly customAmqpConnection: CustomAmqpConnection
  ) {
    super(InvitesHelperService.name);
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

  async getProjectByIdOrThrow(projectId: number) {
    return this.projectsService.getProjectByIdOrThrow(projectId);
  }

  async getProjectById(projectId: number) {
    return this.projectsService.getProjectById(projectId);
  }

  async getUserByEmailOrThrow(email: string) {
    const user = await this.getUserByEmail(email);

    if (!user) {
      this.logAndThrowError(new NotFoundException('User not found'));
    }

    return user;
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

  async getUserByIdOrThrow(id: number) {
    const payload: GetUserByIdContract.Dto = {
      id,
    };

    const user =
      await this.customAmqpConnection.requestOrThrow<GetUserByIdContract.Response>(
        GetUserByIdContract.routingKey,
        payload
      );

    if (!user) {
      this.logAndThrowError(new NotFoundException('User not found'));
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

  async throwIfUserTypeDoesNotMatch(
    user: UserEntity,
    expectedUserType: UserType
  ) {
    if (!user || user.userType !== expectedUserType) {
      this.logAndThrowError(
        new BadRequestException(`${expectedUserType} user not found`)
      );
    }

    return user;
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
      this.logAndThrowError(new NotFoundException('User not found'));
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
}
