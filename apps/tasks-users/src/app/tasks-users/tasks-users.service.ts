import { RabbitRPC } from '@golevelup/nestjs-rabbitmq';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { BaseService } from '@taskfusion-microservices/common';
import {
  CreateTaskUserRelation,
  DeleteTaskUserRelation,
  GetTaskUserRelation,
  GetTaskIdsByUserIdContract,
  GetUserIdsByTaskIdContract,
} from '@taskfusion-microservices/contracts';
import { TasksUsersEntity } from '@taskfusion-microservices/entities';
import { FindOptionsWhere, Repository } from 'typeorm';

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
  async getTaskIdsByUserIdRpcHandler(
    dto: GetTaskIdsByUserIdContract.Dto
  ): Promise<GetTaskIdsByUserIdContract.Response> {
    this.logger.log('Retrieving user task ids');

    return this.getTaskIdsByUserId(dto);
  }

  private async getTaskIdsByUserId(
    dto: GetTaskIdsByUserIdContract.Dto
  ): Promise<GetTaskIdsByUserIdContract.Response> {
    const { userId } = dto;

    const entries = await this.findTaskUserRelations({
      userId,
    });

    return {
      taskIds: entries.map((entry) => entry.taskId),
    };
  }

  private async findTaskUserRelations(where: FindOptionsWhere<TasksUsersEntity>) {
    return this.tasksUsersRepository.find({
      where,
    });
  }

  @RabbitRPC({
    exchange: GetUserIdsByTaskIdContract.exchange,
    routingKey: GetUserIdsByTaskIdContract.routingKey,
    queue: GetUserIdsByTaskIdContract.queue,
  })
  async getUserIdsByTaskIdRpcHandler(
    dto: GetUserIdsByTaskIdContract.Dto
  ): Promise<GetUserIdsByTaskIdContract.Response> {
    this.logger.log('Retrieving task user ids');

    return this.getUserIdsByTaskId(dto);
  }

  private async getUserIdsByTaskId(
    dto: GetUserIdsByTaskIdContract.Dto
  ): Promise<GetUserIdsByTaskIdContract.Response> {
    const { taskId } = dto;

    const entries = await this.findTaskUserRelations({
      taskId,
    });

    return {
      userIds: entries.map((entry) => entry.userId),
    };
  }

  @RabbitRPC({
    exchange: GetTaskUserRelation.exchange,
    routingKey: GetTaskUserRelation.routingKey,
    queue: GetTaskUserRelation.queue,
  })
  async getTaskUserRelationRpcHandler(
    dto: GetTaskUserRelation.Dto
  ): Promise<GetTaskUserRelation.Response> {
    this.logger.log('Retrieving task user relation');

    return this.getTaskUserRelation(dto);
  }

  private async getTaskUserRelation(
    dto: GetTaskUserRelation.Dto
  ): Promise<GetTaskUserRelation.Response> {
    const { taskId, userId } = dto;

    const entry = await this.findTaskUserRelation({
      taskId,
      userId,
    });

    return entry;
  }

  private async findTaskUserRelation(where: FindOptionsWhere<TasksUsersEntity>) {
    return this.tasksUsersRepository.findOne({
      where,
    });
  }

  @RabbitRPC({
    exchange: DeleteTaskUserRelation.exchange,
    routingKey: DeleteTaskUserRelation.routingKey,
    queue: DeleteTaskUserRelation.queue,
  })
  async deleteTaskUserRelationRpcHandler(
    dto: DeleteTaskUserRelation.Dto
  ): Promise<DeleteTaskUserRelation.Response> {
    this.logger.log('Deleting task user relation');

    return this.deleteTaskUserRelation(dto);
  }

  private async deleteTaskUserRelation(
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
  async createTaskUserRelationRpcHandler(
    dto: CreateTaskUserRelation.Dto
  ): Promise<CreateTaskUserRelation.Response> {
    this.logger.log('Creating task user relation');

    return this.createTaskUserRelation(dto);
  }

  private async createTaskUserRelation(
    dto: CreateTaskUserRelation.Dto
  ): Promise<CreateTaskUserRelation.Response> {
    const { taskId, userId } = dto;

    const entry = this.tasksUsersRepository.create({
      taskId,
      userId,
    });

    await this.tasksUsersRepository.save(entry);

    return entry;
  }
}
