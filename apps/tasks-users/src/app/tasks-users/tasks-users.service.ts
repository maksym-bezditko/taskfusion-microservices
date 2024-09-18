import { RabbitRPC } from '@golevelup/nestjs-rabbitmq';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { BaseService } from '@taskfusion-microservices/common';
import {
  CreateTaskUserRelation,
  DeleteTaskUserRelation,
  FindTaskUserRelation,
  GetTaskIdsByUserIdContract,
  GetUserIdsByTaskIdContract,
} from '@taskfusion-microservices/contracts';
import { TasksUsersEntity } from '@taskfusion-microservices/entities';
import { Repository } from 'typeorm';

@Injectable()
export class TasksUsersService extends BaseService {
  constructor(
    @InjectRepository(TasksUsersEntity)
    private readonly tasksUsersRepository: Repository<TasksUsersEntity>
  ) {
    super(TasksUsersService.name);
  }

  @RabbitRPC({
    exchange: GetTaskIdsByUserIdContract.exchange,
    routingKey: GetTaskIdsByUserIdContract.routingKey,
    queue: GetTaskIdsByUserIdContract.queue,
  })
  async getTaskIdsByUserId(
    dto: GetTaskIdsByUserIdContract.Dto
  ): Promise<GetTaskIdsByUserIdContract.Response> {
    const { userId } = dto;

    const entries = await this.tasksUsersRepository.find({
      where: {
        userId,
      },
    });

    this.logger.log('Retrieving user task ids');

    return {
      taskIds: entries.map((entry) => entry.taskId),
    };
  }

  @RabbitRPC({
    exchange: GetUserIdsByTaskIdContract.exchange,
    routingKey: GetUserIdsByTaskIdContract.routingKey,
    queue: GetUserIdsByTaskIdContract.queue,
  })
  async getUserIdsByTaskId(
    dto: GetUserIdsByTaskIdContract.Dto
  ): Promise<GetUserIdsByTaskIdContract.Response> {
    const { taskId } = dto;

    const entries = await this.tasksUsersRepository.find({
      where: {
        taskId,
      },
    });

    this.logger.log('Retrieving task user ids');

    return {
      userIds: entries.map((entry) => entry.userId),
    };
  }

  @RabbitRPC({
    exchange: FindTaskUserRelation.exchange,
    routingKey: FindTaskUserRelation.routingKey,
    queue: FindTaskUserRelation.queue,
  })
  async findTaskUserRelation(
    dto: FindTaskUserRelation.Dto
  ): Promise<FindTaskUserRelation.Response> {
    const { taskId, userId } = dto;

    const entry = await this.tasksUsersRepository.findOne({
      where: {
        taskId,
        userId,
      },
    });

    this.logger.log('Retrieving task user relation');

    return entry;
  }

  @RabbitRPC({
    exchange: DeleteTaskUserRelation.exchange,
    routingKey: DeleteTaskUserRelation.routingKey,
    queue: DeleteTaskUserRelation.queue,
  })
  async deleteTaskUserRelation(
    dto: DeleteTaskUserRelation.Dto
  ): Promise<DeleteTaskUserRelation.Response> {
    const { taskId, userId } = dto;

    const deleteResult = await this.tasksUsersRepository.delete({
      taskId,
      userId,
    });

    this.logger.log('Deleting task user relation');

    return {
      success: Boolean(deleteResult.affected && deleteResult.affected > 0),
    };
  }

  @RabbitRPC({
    exchange: CreateTaskUserRelation.exchange,
    routingKey: CreateTaskUserRelation.routingKey,
    queue: CreateTaskUserRelation.queue,
  })
  async createTaskUserRelation(
    dto: CreateTaskUserRelation.Dto
  ): Promise<CreateTaskUserRelation.Response> {
    const { taskId, userId } = dto;

    const entry = this.tasksUsersRepository.create({
      taskId,
      userId,
    });

    await this.tasksUsersRepository.save(entry);

    this.logger.log('Creating task user relation');

    return entry;
  }
}
