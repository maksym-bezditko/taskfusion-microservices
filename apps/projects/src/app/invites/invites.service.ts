import {
  AmqpConnection,
  defaultNackErrorHandler,
  MessageHandlerErrorBehavior,
  RabbitRPC,
} from '@golevelup/nestjs-rabbitmq';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  GetUsersByIdsContract,
  InvitePmContract,
} from '@taskfusion-microservices/contracts';
import {
  InviteEntity,
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
  async createProject(
    dto: InvitePmContract.Dto
  ): Promise<InvitePmContract.Response> {
    const { clientUserId, pmUserId, projectId } = dto;

    const project = await this.appService.getProjectById({
      projectId,
    });

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

		console.log(users);

    const clientUser = users.find((user) => user.id === clientUserId);
    const pmUser = users.find((user) => user.id === pmUserId);

    if (!clientUser) {
      throw new Error('Client user not found');
    }

    if (!pmUser) {
      throw new Error('PM user not found');
    }

    const invite = await this.inviteEntityRepositoty.save({
      clientUserId,
      pmUserId,
      projectId,
      isActive: true,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 1), // 1 day
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return {
      id: invite.id,
    };
  }
}
