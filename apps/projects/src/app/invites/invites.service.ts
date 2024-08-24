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
  AcceptPmInviteContract,
  AssignUserToProjectContract,
  CheckUserContract,
  GetUsersByIdsContract,
  InvitePmContract,
  RejectPmInviteContract,
} from '@taskfusion-microservices/contracts';
import {
  InviteEntity,
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
    @InjectRepository(InviteEntity)
    private readonly inviteEntityRepositoty: Repository<InviteEntity>,
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
    const { clientUserId, pmUserId, projectId } = dto;

    const project = await this.appService.getProjectById({
      projectId,
    });

    if (project.clientId !== clientUserId) {
      throw new BadRequestException('Project not found');
    }

    if (!project) {
      throw new Error('Project not found');
    }

    const usersResult =
      await this.amqpConnection.request<GetUsersByIdsContract.Response>({
        exchange: GetUsersByIdsContract.exchange,
        routingKey: GetUsersByIdsContract.routingKey,
        payload: {
          ids: [clientUserId, pmUserId],
        } as GetUsersByIdsContract.Request,
      });

    const users = await handleRpcRequest(
      usersResult,
      async (response) => response
    );

    const clientUser = users.find((user) => user.id === clientUserId);
    const pmUser = users.find((user) => user.id === pmUserId);

    if (!clientUser || clientUser.userType !== UserType.CLIENT) {
      throw new Error('Client user not found');
    }

    if (!pmUser || pmUser.userType !== UserType.PM) {
      throw new Error('PM user not found');
    }

    const invite = await this.inviteEntityRepositoty.save({
      clientUserId,
      pmUserId,
      project: project,
      isActive: true,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 1), // 1 day
      createdAt: new Date(),
      updatedAt: new Date(),
    });

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
  async acceptInvite(
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

    const invite = await this.inviteEntityRepositoty.findOne({
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

    await this.inviteEntityRepositoty.update(
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

    const invite = await this.inviteEntityRepositoty.findOne({
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

    await this.inviteEntityRepositoty.update(
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
