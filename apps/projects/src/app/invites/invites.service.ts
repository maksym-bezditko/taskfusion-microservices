import {
  AmqpConnection,
  defaultNackErrorHandler,
  MessageHandlerErrorBehavior,
  RabbitRPC,
} from '@golevelup/nestjs-rabbitmq';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  AcceptDeveloperInviteContract,
  AcceptPmInviteContract,
  AssignUserToProjectContract,
  CheckUserContract,
  GetDeveloperInviteByIdContract,
  GetPmInviteByIdContract,
  GetProjectPmIdContract,
  GetUserByEmailContract,
  GetUserByIdContract,
  InviteDeveloperContract,
  InvitePmContract,
  RejectDeveloperInviteContract,
  RejectPmInviteContract,
  SendEmailContract,
} from '@taskfusion-microservices/contracts';
import {
  PmInviteEntity,
  DeveloperInviteEntity,
  InviteStatus,
  ProjectParticipantRole,
  UserType,
  ProjectEntity,
  UserEntity,
} from '@taskfusion-microservices/entities';
import { Repository } from 'typeorm';
import { AppService } from '../app.service';
import { handleRpcRequest } from '@taskfusion-microservices/helpers';

@Injectable()
export class InvitesService {
  constructor(
    @InjectRepository(PmInviteEntity)
    private readonly pmInviteEntityRepositoty: Repository<PmInviteEntity>,
    @InjectRepository(DeveloperInviteEntity)
    private readonly developerInviteEntityRepositoty: Repository<DeveloperInviteEntity>,
    private readonly appService: AppService,
    private readonly amqpConnection: AmqpConnection
  ) {}

  @RabbitRPC({
    exchange: InvitePmContract.exchange,
    routingKey: InvitePmContract.routingKey,
    queue: InvitePmContract.queue,
    errorBehavior: MessageHandlerErrorBehavior.NACK,
    errorHandler: defaultNackErrorHandler,
    allowNonJsonMessages: true,
    name: 'invite-pm',
  })
  async invitePm(
    dto: InvitePmContract.Dto
  ): Promise<InvitePmContract.Response> {
    const { clientUserId, email, projectId } = dto;

    const project = await this.getProjectById(projectId);

    await this.validateProjectClient(project, clientUserId);

    const pmUser = await this.getUserByEmail(email, UserType.PM);
    const clientUser = await this.getClientUserById(clientUserId);

    const existingInvite = await this.pmInviteEntityRepositoty.findOne({
      where: {
        clientUserId,
        pmUserId: pmUser.id,
        projectId: project.id,
      },
    });

    if (existingInvite) {
      return this.handleExistingPmInvite(existingInvite, pmUser, clientUser);
    }

    const invite = await this.createPmInvite(clientUserId, pmUser.id, project);

    this.sendInvitationEmail({
      recipientEmail: pmUser.email,
      title: 'Project Invitation from TaskFusion',
      inviterName: clientUser.name,
      inviterEmail: clientUser.email,
      inviteId: invite.id,
      invitedUserType: UserType.PM,
    });

    return { id: invite.id };
  }

  @RabbitRPC({
    exchange: AcceptPmInviteContract.exchange,
    routingKey: AcceptPmInviteContract.routingKey,
    queue: AcceptPmInviteContract.queue,
    errorBehavior: MessageHandlerErrorBehavior.NACK,
    errorHandler: defaultNackErrorHandler,
    allowNonJsonMessages: true,
    name: 'accept-pm-invite',
  })
  async acceptPmInvite(
    dto: AcceptPmInviteContract.Dto
  ): Promise<AcceptPmInviteContract.Response> {
    const { inviteId, pmUserId } = dto;

    await this.checkIfUserExists(pmUserId);

    const invite = await this.getPmInviteById({
      id: inviteId,
    });

    if (!invite) {
      throw new NotFoundException('Invite not found');
    }

    if (!this.isPmInviteActive(invite)) {
      throw new BadRequestException('Invite is not valid anymore');
    }

    await this.pmInviteEntityRepositoty.update(
      {
        id: inviteId,
      },
      {
        inviteStatus: InviteStatus.ACCEPTED,
        updatedAt: new Date(),
      }
    );

    await this.amqpConnection.request<AssignUserToProjectContract.Response>({
      exchange: AssignUserToProjectContract.exchange,
      routingKey: AssignUserToProjectContract.routingKey,
      payload: {
        projectId: invite.projectId,
        userId: pmUserId,
        role: ProjectParticipantRole.PM,
      } as AssignUserToProjectContract.Request,
    });

    return {
      success: true,
    };
  }

  @RabbitRPC({
    exchange: RejectPmInviteContract.exchange,
    routingKey: RejectPmInviteContract.routingKey,
    queue: RejectPmInviteContract.queue,
    errorBehavior: MessageHandlerErrorBehavior.NACK,
    errorHandler: defaultNackErrorHandler,
    allowNonJsonMessages: true,
    name: 'reject-pm-invite',
  })
  async rejectPmInvite(
    dto: RejectPmInviteContract.Dto
  ): Promise<RejectPmInviteContract.Response> {
    const { inviteId, pmUserId } = dto;

    await this.checkIfUserExists(pmUserId);

    const invite = await this.pmInviteEntityRepositoty.findOne({
      where: {
        id: inviteId,
      },
    });

    if (!invite) {
      throw new NotFoundException('Invite not found');
    }

    if (!this.isPmInviteActive(invite)) {
      throw new BadRequestException('Invite is not valid anymore');
    }

    await this.pmInviteEntityRepositoty.update(
      {
        id: inviteId,
      },
      {
        inviteStatus: InviteStatus.REJECTED,
        updatedAt: new Date(),
      }
    );

    return {
      success: true,
    };
  }

  @RabbitRPC({
    exchange: GetDeveloperInviteByIdContract.exchange,
    routingKey: GetDeveloperInviteByIdContract.routingKey,
    queue: GetDeveloperInviteByIdContract.queue,
    errorBehavior: MessageHandlerErrorBehavior.NACK,
    errorHandler: defaultNackErrorHandler,
    allowNonJsonMessages: true,
    name: 'get-developer-invite-by-id',
  })
  async getDeveloperInviteById(
    dto: GetDeveloperInviteByIdContract.Dto
  ): Promise<GetDeveloperInviteByIdContract.Response> {
    const { id } = dto;

    const developerInvite = await this.developerInviteEntityRepositoty.findOne({
      where: {
        id,
      },
      relations: ['project'],
    });

    return developerInvite;
  }

  @RabbitRPC({
    exchange: GetPmInviteByIdContract.exchange,
    routingKey: GetPmInviteByIdContract.routingKey,
    queue: GetPmInviteByIdContract.queue,
    errorBehavior: MessageHandlerErrorBehavior.NACK,
    errorHandler: defaultNackErrorHandler,
    allowNonJsonMessages: true,
    name: 'get-pm-invite-by-id',
  })
  async getPmInviteById(
    dto: GetPmInviteByIdContract.Dto
  ): Promise<GetPmInviteByIdContract.Response> {
    const { id } = dto;

    const pmInvite = await this.pmInviteEntityRepositoty.findOne({
      where: {
        id,
      },
      relations: ['project'],
    });

    return pmInvite;
  }

  @RabbitRPC({
    exchange: InviteDeveloperContract.exchange,
    routingKey: InviteDeveloperContract.routingKey,
    queue: InviteDeveloperContract.queue,
    errorBehavior: MessageHandlerErrorBehavior.NACK,
    errorHandler: defaultNackErrorHandler,
    allowNonJsonMessages: true,
    name: 'invite-developer',
  })
  async inviteDeveloper(
    dto: InviteDeveloperContract.Dto
  ): Promise<InviteDeveloperContract.Response> {
    const { pmUserId, email, projectId } = dto;

    const project = await this.getProjectById(projectId);

    await this.validateProjectPm(project, pmUserId);

    const developerUser = await this.getUserByEmail(email, UserType.DEVELOPER);
    const pmUser = await this.getUserById(pmUserId, UserType.PM);

    const existingInvite = await this.developerInviteEntityRepositoty.findOne({
      where: {
        pmUserId: pmUser.id,
        projectId: project.id,
        developerUserId: developerUser.id,
      },
    });

    if (existingInvite) {
      return this.handleExistingDeveloperInvite(
        existingInvite,
        pmUser,
        developerUser
      );
    }

    const invite = await this.createDeveloperInvite(
      pmUser.id,
      developerUser.id,
      project
    );

    this.sendInvitationEmail({
      recipientEmail: developerUser.email,
      title: 'Project Invitation from TaskFusion',
      inviterName: pmUser.name,
      inviterEmail: pmUser.email,
      inviteId: invite.id,
      invitedUserType: UserType.DEVELOPER,
    });

    return { id: invite.id };
  }

  @RabbitRPC({
    exchange: AcceptDeveloperInviteContract.exchange,
    routingKey: AcceptDeveloperInviteContract.routingKey,
    queue: AcceptDeveloperInviteContract.queue,
    errorBehavior: MessageHandlerErrorBehavior.NACK,
    errorHandler: defaultNackErrorHandler,
    allowNonJsonMessages: true,
    name: 'accept-developer-invite',
  })
  async acceptDeveloperInvite(
    dto: AcceptDeveloperInviteContract.Dto
  ): Promise<AcceptDeveloperInviteContract.Response> {
    const { inviteId, developerUserId } = dto;

    await this.checkIfUserExists(developerUserId);

    const invite = await this.developerInviteEntityRepositoty.findOne({
      where: {
        id: inviteId,
      },
    });

    if (!invite) {
      throw new NotFoundException('Invite not found');
    }

    if (!this.isDeveloperInviteActive(invite)) {
      throw new BadRequestException('Invite is not valid anymore');
    }

    await this.developerInviteEntityRepositoty.update(
      {
        id: inviteId,
      },
      {
        inviteStatus: InviteStatus.ACCEPTED,
        updatedAt: new Date(),
      }
    );

    await this.amqpConnection.request<AssignUserToProjectContract.Response>({
      exchange: AssignUserToProjectContract.exchange,
      routingKey: AssignUserToProjectContract.routingKey,
      payload: {
        projectId: invite.projectId,
        userId: developerUserId,
        role: ProjectParticipantRole.DEVELOPER,
      } as AssignUserToProjectContract.Request,
    });

    return {
      success: true,
    };
  }

  @RabbitRPC({
    exchange: RejectDeveloperInviteContract.exchange,
    routingKey: RejectDeveloperInviteContract.routingKey,
    queue: RejectDeveloperInviteContract.queue,
    errorBehavior: MessageHandlerErrorBehavior.NACK,
    errorHandler: defaultNackErrorHandler,
    allowNonJsonMessages: true,
    name: 'reject-developer-invite',
  })
  async rejectDeveloperInvite(
    dto: RejectDeveloperInviteContract.Dto
  ): Promise<RejectDeveloperInviteContract.Response> {
    const { inviteId, developerUserId } = dto;

    await this.checkIfUserExists(developerUserId);

    const invite = await this.developerInviteEntityRepositoty.findOne({
      where: {
        id: inviteId,
      },
    });

    if (!invite) {
      throw new NotFoundException('Invite not found');
    }

    if (!this.isDeveloperInviteActive(invite)) {
      throw new BadRequestException('Invite is not valid anymore');
    }

    await this.developerInviteEntityRepositoty.update(
      {
        id: inviteId,
      },
      {
        inviteStatus: InviteStatus.REJECTED,
        updatedAt: new Date(),
      }
    );

    return {
      success: true,
    };
  }

  private isPmInviteActive(invite: PmInviteEntity) {
    return (
      new Date(invite.expiresAt) > new Date() &&
      invite.pmUserId === invite.pmUserId &&
      invite.inviteStatus === InviteStatus.PENDING
    );
  }

  private isDeveloperInviteActive(invite: DeveloperInviteEntity) {
    return (
      new Date(invite.expiresAt) > new Date() &&
      invite.developerUserId === invite.developerUserId &&
      invite.inviteStatus === InviteStatus.PENDING
    );
  }

  private async sendInvitationEmail(params: {
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

    await this.amqpConnection.publish(
      SendEmailContract.exchange,
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

  private async validateProjectClient(
    project: ProjectEntity,
    clientUserId: number
  ) {
    if (!project || project.clientId !== clientUserId) {
      throw new BadRequestException('Project not found');
    }

    return project;
  }

  private async validateProjectPm(project: ProjectEntity, pmUserId: number) {
    const result =
      await this.amqpConnection.request<GetProjectPmIdContract.Response>({
        exchange: GetProjectPmIdContract.exchange,
        routingKey: GetProjectPmIdContract.routingKey,
        payload: {
          projectId: project.id,
        } as GetProjectPmIdContract.Dto,
      });

    const { pmUserId: projectPmUserId } = await handleRpcRequest(
      result,
      async (response) => response
    );

    if (!projectPmUserId || projectPmUserId !== pmUserId) {
      throw new BadRequestException('Project not found');
    }
  }

  private async getProjectById(id: number) {
    return this.appService.getProjectById({ projectId: id });
  }

  private async getUserByEmail(email: string, expectedUserType: UserType) {
    const userResult =
      await this.amqpConnection.request<GetUserByEmailContract.Response>({
        exchange: GetUserByEmailContract.exchange,
        routingKey: GetUserByEmailContract.routingKey,
        payload: { email } as GetUserByEmailContract.Request,
      });

    const user = await handleRpcRequest(
      userResult,
      async (response) => response
    );

    if (!user || user.userType !== expectedUserType) {
      throw new Error(`${expectedUserType} user not found`);
    }

    return user;
  }

  private async getUserById(id: number, expectedUserType: UserType) {
    const userResult =
      await this.amqpConnection.request<GetUserByIdContract.Response>({
        exchange: GetUserByIdContract.exchange,
        routingKey: GetUserByIdContract.routingKey,
        payload: {
          id,
        } as GetUserByIdContract.Request,
      });

    const user = await handleRpcRequest(
      userResult,
      async (response) => response
    );

    if (!user || user.userType !== expectedUserType) {
      throw new Error(`${expectedUserType} user not found`);
    }

    return user;
  }

  private async getClientUserById(clientUserId: number) {
    const clientUserResult =
      await this.amqpConnection.request<GetUserByIdContract.Response>({
        exchange: GetUserByIdContract.exchange,
        routingKey: GetUserByIdContract.routingKey,
        payload: { id: clientUserId } as GetUserByIdContract.Request,
      });

    const clientUser = await handleRpcRequest(
      clientUserResult,
      async (response) => response
    );

    if (!clientUser || clientUser.userType !== UserType.CLIENT) {
      throw new Error('Client user not found');
    }
    return clientUser;
  }

  private async createPmInvite(
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

  private async createDeveloperInvite(
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

  private async handleExistingPmInvite(
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

  private async handleExistingDeveloperInvite(
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

  private async checkIfUserExists(userId: number) {
    const userResult =
      await this.amqpConnection.request<CheckUserContract.Response>({
        exchange: CheckUserContract.exchange,
        routingKey: CheckUserContract.routingKey,
        payload: {
          userId,
        } as CheckUserContract.Request,
      });

    await handleRpcRequest<CheckUserContract.Response>(
      userResult,
      async (response) => {
        if (!response.exists) {
          throw new NotFoundException('User not found!');
        }
      }
    );
  }
}
