import {
  AmqpConnection,
  defaultNackErrorHandler,
  MessageHandlerErrorBehavior,
  RabbitRPC,
  RabbitSubscribe,
} from '@golevelup/nestjs-rabbitmq';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  CreateActionContract,
  GetActionsByTaskIdContract,
  GetUsersByIdsContract,
} from '@taskfusion-microservices/contracts';
import { ActionEntity } from '@taskfusion-microservices/entities';
import { handleRpcRequest } from '@taskfusion-microservices/helpers';
import { Repository } from 'typeorm';

@Injectable()
export class AppService {
  constructor(
    @InjectRepository(ActionEntity)
    private readonly actionRepository: Repository<ActionEntity>,
    private readonly amqpConnection: AmqpConnection
  ) {}

  @RabbitSubscribe({
    exchange: CreateActionContract.exchange,
    routingKey: CreateActionContract.routingKey,
    queue: CreateActionContract.queue,
  })
  async createAction(dto: CreateActionContract.Dto) {
    const { title, userId, taskId } = dto;

    const action = this.actionRepository.create({
      title,
      userId,
      taskId,
    });

    await this.actionRepository.save(action);
  }

  @RabbitRPC({
    exchange: GetActionsByTaskIdContract.exchange,
    routingKey: GetActionsByTaskIdContract.routingKey,
    queue: GetActionsByTaskIdContract.queue,
    errorBehavior: MessageHandlerErrorBehavior.NACK,
    errorHandler: defaultNackErrorHandler,
    allowNonJsonMessages: true,
    name: 'get-actions-by-task-id',
  })
  async getActionsByTaskId(
    dto: GetActionsByTaskIdContract.Request
  ): Promise<GetActionsByTaskIdContract.Response> {
    const { taskId } = dto;

    const actionsResult = await this.actionRepository.find({
      where: { taskId },
    });

    const userIds = actionsResult.map((action) => action.userId);

    const usersResult =
      await this.amqpConnection.request<GetUsersByIdsContract.Response>({
        exchange: GetUsersByIdsContract.exchange,
        routingKey: GetUsersByIdsContract.routingKey,
        payload: {
          ids: userIds,
        } as GetUsersByIdsContract.Request,
      });

    const users = await handleRpcRequest(
      usersResult,
      async (response) => response
    );

    return actionsResult.map((action) => ({
      ...action,
      user: users.find((user) => user.id === action.userId),
    }));
  }
}
