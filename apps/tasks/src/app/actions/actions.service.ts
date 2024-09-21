import { RabbitRPC } from '@golevelup/nestjs-rabbitmq';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  CreateActionContract,
  GetActionsByTaskIdContract,
  GetUsersByIdsContract,
} from '@taskfusion-microservices/contracts';
import { ActionEntity } from '@taskfusion-microservices/entities';
import { FindManyOptions, Repository } from 'typeorm';
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
  })
  async createActionRpcHandler(dto: CreateActionContract.Dto) {
    this.logger.log(`Action created`);

    return this.createAction(dto);
  }

  private async createAction(dto: CreateActionContract.Dto) {
    const { title, userId, taskId } = dto;

    const task = await this.tasksService.getTaskByIdOrThrow(taskId);

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
  })
  async getActionsByTaskIdRpcHandler(
    dto: GetActionsByTaskIdContract.Dto
  ): Promise<GetActionsByTaskIdContract.Response> {
    this.logger.log('Retrieving actions by task id');

    return this.getActionsWithUsersByTaskId(dto);
  }

  private async getActionsWithUsersByTaskId(
    dto: GetActionsByTaskIdContract.Dto
  ): Promise<GetActionsByTaskIdContract.Response> {
    const { taskId } = dto;

    const actionsResult = await this.findActions({
      where: {
        taskId,
      },
      order: { createdAt: 'DESC' },
    });

    const userIds = actionsResult.map((action) => action.userId);
    const users = await this.getUsersByIds(userIds);

    return actionsResult.map((action) => ({
      ...action,
      user: users.find((user) => user.id === action.userId),
    }));
  }

  private async findActions(options: FindManyOptions<ActionEntity>) {
    return this.actionRepository.find(options);
  }

  private async getUsersByIds(userIds: number[]) {
    const dto: GetUsersByIdsContract.Dto = {
      ids: userIds,
    };

    const users =
      await this.customAmqpConnection.requestOrThrow<GetUsersByIdsContract.Response>(
        GetUsersByIdsContract.routingKey,
        dto
      );

    return users;
  }
}
