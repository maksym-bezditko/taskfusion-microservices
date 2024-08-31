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
  GetPmInviteByIdContract,
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

    const project = await this.appService.getProjectById({
      projectId,
    });

    if (project.clientId !== clientUserId) {
      throw new BadRequestException('Project not found');
    }

    if (!project) {
      throw new Error('Project not found');
    }

    const pmUserResult =
      await this.amqpConnection.request<GetUserByEmailContract.Response>({
        exchange: GetUserByEmailContract.exchange,
        routingKey: GetUserByEmailContract.routingKey,
        payload: {
          email,
        } as GetUserByEmailContract.Request,
      });

    const pmUser = await handleRpcRequest(
      pmUserResult,
      async (response) => response
    );

    if (!pmUser || pmUser.userType !== UserType.PM) {
      throw new Error('PM user not found');
    }

    const clientUserResult =
      await this.amqpConnection.request<GetUserByIdContract.Response>({
        exchange: GetUserByIdContract.exchange,
        routingKey: GetUserByIdContract.routingKey,
        payload: {
          id: clientUserId,
        } as GetUserByIdContract.Request,
      });

    const clientUser = await handleRpcRequest(
      clientUserResult,
      async (response) => response
    );

    if (!clientUser || clientUser.userType !== UserType.CLIENT) {
      throw new Error('Client user not found');
    }

    const existingInvite = await this.pmInviteEntityRepositoty.findOne({
      where: {
        clientUserId,
        pmUserId: pmUser.id,
        projectId: project.id,
      },
    });

    if (existingInvite) {
      throw new Error('Invite already exists');
    }

    const invite = await this.pmInviteEntityRepositoty.save({
      clientUserId,
      pmUserId: pmUser.id,
      project: project,
      isActive: true,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 1), // 1 day
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await this.amqpConnection.publish(
      SendEmailContract.exchange,
      SendEmailContract.routingKey,
      {
        recipientEmail: pmUser.email,
        subject: 'Project Invitation from TaskFusion',
        message: `
          <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
            <h2 style="color: #4CAF50; text-align: center;">Project Invitation</h2>
            <p>Hi,</p>
            <p>You have been invited to join the project <strong>${project.title}</strong> by <strong>${clientUser.name}</strong> (${clientUser.email}).</p>
            <p style="text-align: center;">
              <a href="http://localhost:8000/pm/project-invitation/${invite.id}" 
                style="display: inline-block; padding: 10px 20px; color: white; background-color: #4CAF50; border-radius: 5px; text-decoration: none; font-weight: bold;">
                Accept Invitation
              </a>
            </p>
            <p>If the button above doesn’t work, please click on the link below or copy and paste it into your browser:</p>
            <p style="word-break: break-all;">
              <a href="http://localhost:8000/pm/project-invitation/${invite.id}" style="color: #4CAF50;">
                http://localhost:8000/pm/project-invitation/${invite.id}
              </a>
            </p>
            <p>Thank you!</p>
          </div>
        `,
      } as SendEmailContract.Dto
    );

    return {
      id: invite.id,
    };
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

    const userResult =
      await this.amqpConnection.request<CheckUserContract.Response>({
        exchange: CheckUserContract.exchange,
        routingKey: CheckUserContract.routingKey,
        payload: {
          userId: pmUserId,
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

    const invite = await this.pmInviteEntityRepositoty.findOne({
      where: {
        id: inviteId,
      },
    });

    if (!invite) {
      throw new NotFoundException('Invite not found');
    }

    const isInviteValid =
      new Date(invite.expiresAt) > new Date() &&
      invite.inviteStatus === InviteStatus.PENDING &&
      invite.pmUserId === pmUserId;

    if (!isInviteValid) {
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

    const userResult =
      await this.amqpConnection.request<CheckUserContract.Response>({
        exchange: CheckUserContract.exchange,
        routingKey: CheckUserContract.routingKey,
        payload: {
          userId: pmUserId,
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

    const invite = await this.pmInviteEntityRepositoty.findOne({
      where: {
        id: inviteId,
      },
    });

    if (!invite) {
      throw new NotFoundException('Invite not found');
    }

    const isInviteValid =
      new Date(invite.expiresAt) > new Date() &&
      invite.inviteStatus === InviteStatus.PENDING &&
      invite.pmUserId === pmUserId;

    if (!isInviteValid) {
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

    const project = await this.appService.getProjectById({
      projectId,
    });

    // check if project is assigned to PM

    if (!project) {
      throw new Error('Project not found');
    }

    const developerUserResult =
      await this.amqpConnection.request<GetUserByEmailContract.Response>({
        exchange: GetUserByEmailContract.exchange,
        routingKey: GetUserByEmailContract.routingKey,
        payload: {
          email,
        } as GetUserByEmailContract.Request,
      });

    const developerUser = await handleRpcRequest(
      developerUserResult,
      async (response) => response
    );

    if (!developerUser || developerUser.userType !== UserType.DEVELOPER) {
      throw new Error('Developer user not found');
    }

    const pmUserResult =
      await this.amqpConnection.request<GetUserByIdContract.Response>({
        exchange: GetUserByIdContract.exchange,
        routingKey: GetUserByIdContract.routingKey,
        payload: {
          id: pmUserId,
        } as GetUserByIdContract.Request,
      });

    const pmUser = await handleRpcRequest(
      pmUserResult,
      async (response) => response
    );

    if (!pmUser || pmUser.userType !== UserType.PM) {
      throw new Error('Pm user not found');
    }

    const existingInvite = await this.developerInviteEntityRepositoty.findOne({
      where: {
        pmUserId: pmUser.id,
        projectId: project.id,
        developerUserId: developerUser.id,
      },
    });

    if (existingInvite) {
      throw new Error('Invite already exists');
    }

    const invite = await this.developerInviteEntityRepositoty.save({
      developerUserId: developerUser.id,
      pmUserId: pmUser.id,
      project: project,
      isActive: true,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 1), // 1 day
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await this.amqpConnection.publish(
      SendEmailContract.exchange,
      SendEmailContract.routingKey,
      {
        recipientEmail: developerUser.email,
        subject: 'Project Invitation from TaskFusion',
        message: `
          <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
            <h2 style="color: #4CAF50; text-align: center;">Project Invitation</h2>
            <p>Hi,</p>
            <p>You have been invited to join the project <strong>${project.title}</strong> by <strong>${pmUser.name}</strong> (${pmUser.email}).</p>
            <p style="text-align: center;">
              <a href="http://localhost:8000/developer/project-invitation/${invite.id}" 
                style="display: inline-block; padding: 10px 20px; color: white; background-color: #4CAF50; border-radius: 5px; text-decoration: none; font-weight: bold;">
                Accept Invitation
              </a>
            </p>
            <p>If the button above doesn’t work, please click on the link below or copy and paste it into your browser:</p>
            <p style="word-break: break-all;">
              <a href="http://localhost:8000/developer/project-invitation/${invite.id}" style="color: #4CAF50;">
                http://localhost:8000/developer/project-invitation/${invite.id}
              </a>
            </p>
            <p>Thank you!</p>
          </div>
        `,
      } as SendEmailContract.Dto
    );

    return {
      id: invite.id,
    };
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

    const userResult =
      await this.amqpConnection.request<CheckUserContract.Response>({
        exchange: CheckUserContract.exchange,
        routingKey: CheckUserContract.routingKey,
        payload: {
          userId: developerUserId,
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

    const invite = await this.developerInviteEntityRepositoty.findOne({
      where: {
        id: inviteId,
      },
    });

    if (!invite) {
      throw new NotFoundException('Invite not found');
    }

    const isInviteValid =
      new Date(invite.expiresAt) > new Date() &&
      invite.inviteStatus === InviteStatus.PENDING &&
      invite.developerUserId === developerUserId;

    if (!isInviteValid) {
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

    const userResult =
      await this.amqpConnection.request<CheckUserContract.Response>({
        exchange: CheckUserContract.exchange,
        routingKey: CheckUserContract.routingKey,
        payload: {
          userId: developerUserId,
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

    const invite = await this.developerInviteEntityRepositoty.findOne({
      where: {
        id: inviteId,
      },
    });

    if (!invite) {
      throw new NotFoundException('Invite not found');
    }

    const isInviteValid =
      new Date(invite.expiresAt) > new Date() &&
      invite.inviteStatus === InviteStatus.PENDING &&
      invite.pmUserId === developerUserId;

    if (!isInviteValid) {
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
}
