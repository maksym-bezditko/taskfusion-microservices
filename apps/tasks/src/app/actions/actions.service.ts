import {
  defaultNackErrorHandler,
  MessageHandlerErrorBehavior,
  RabbitRPC,
} from '@golevelup/nestjs-rabbitmq';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  CreateActionContract,
  GetActionsByTaskIdContract,
  GetUsersByIdsContract,
} from '@taskfusion-microservices/contracts';
import { ActionEntity } from '@taskfusion-microservices/entities';
import { Repository } from 'typeorm';
import { TasksService } from '../tasks/tasks.service';
import {
  BaseService,
  CustomAmqpConnection,
} from '@taskfusion-microservices/common';

@Injectable()
export class ActionsService extends BaseService {
  constructor(
    @InjectRepository(ActionEntity)
    private readonly actionRepository: Repository<ActionEntity>,
    private readonly customAmqpConnection: CustomAmqpConnection,
    private readonly tasksService: TasksService
  ) {
    super(ActionsService.name);
  }

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
      this.logAndThrowError(new NotFoundException('Task not found!'));
    }

    const action = this.actionRepository.create({
      title,
      userId,
      task,
    });

    await this.actionRepository.save(action);

    this.logger.log(`Action created: ${action.id}`);

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

    const getUsersByIdsDto: GetUsersByIdsContract.Dto = {
      ids: userIds,
    };

    const users =
      await this.customAmqpConnection.requestOrThrow<GetUsersByIdsContract.Response>(
        GetUsersByIdsContract.routingKey,
        getUsersByIdsDto
      );

    this.logger.log('Retrieving actions by task id');

    return actionsResult.map((action) => ({
      ...action,
      user: users.find((user) => user.id === action.userId),
    }));
  }
}
