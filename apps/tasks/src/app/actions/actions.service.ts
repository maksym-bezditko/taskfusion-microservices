import {
  AmqpConnection,
  defaultNackErrorHandler,
  MessageHandlerErrorBehavior,
  RabbitRPC,
} from '@golevelup/nestjs-rabbitmq';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  CreateActionContract,
  GetActionsByTaskIdContract,
  GetUsersByIdsContract,
} from '@taskfusion-microservices/contracts';
import { ActionEntity } from '@taskfusion-microservices/entities';
import { Repository } from 'typeorm';
import { TasksService } from '../tasks/tasks.service';
import { handleRpcRequest } from '@taskfusion-microservices/helpers';

@Injectable()
export class ActionsService {
  constructor(
    @InjectRepository(ActionEntity)
    private readonly actionRepository: Repository<ActionEntity>,
    private readonly amqpConnection: AmqpConnection,
    private readonly tasksService: TasksService
  ) {}

  @RabbitRPC({
    exchange: CreateActionContract.exchange,
    routingKey: CreateActionContract.routingKey,
    queue: CreateActionContract.queue,
    errorBehavior: MessageHandlerErrorBehavior.NACK,
    errorHandler: defaultNackErrorHandler,
    allowNonJsonMessages: true,
    name: 'create-action',
  })
  async createAction(dto: CreateActionContract.Dto) {
    const { title, userId, taskId } = dto;

    const task = await this.tasksService.getTaskById({
      taskId,
    });

    if (!task) {
      throw new Error('Task not found!');
    }

    const action = this.actionRepository.create({
      title,
      userId,
      task,
    });

    await this.actionRepository.save(action);

    return action;
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
    dto: GetActionsByTaskIdContract.Dto
  ): Promise<GetActionsByTaskIdContract.Response> {
    const { taskId } = dto;

    const actionsResult = await this.actionRepository.find({
      where: {
        taskId,
      },
      order: { createdAt: 'DESC' },
    });

    const userIds = actionsResult.map((action) => action.userId);

    const usersResult =
      await this.amqpConnection.request<GetUsersByIdsContract.Response>({
        exchange: GetUsersByIdsContract.exchange,
        routingKey: GetUsersByIdsContract.routingKey,
        payload: {
          ids: userIds,
        } as GetUsersByIdsContract.Dto,
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
