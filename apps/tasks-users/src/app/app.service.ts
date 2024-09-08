import {
  RabbitRPC,
  MessageHandlerErrorBehavior,
  defaultNackErrorHandler,
  AmqpConnection,
} from '@golevelup/nestjs-rabbitmq';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  AssignTaskToUserContract,
  CheckTaskContract,
  CheckUserContract,
  CreateActionContract,
  GetTaskIdsByUserIdContract,
  GetUserIdsByTaskIdContract,
  GetUsersByIdsContract,
  UnassignTaskFromUserContract,
} from '@taskfusion-microservices/contracts';
import { TasksUsersEntity } from '@taskfusion-microservices/entities';
import { handleRpcRequest } from '@taskfusion-microservices/helpers';
import { Repository } from 'typeorm';

@Injectable()
export class AppService {
  constructor(
    @InjectRepository(TasksUsersEntity)
    private readonly tasksUsersRepository: Repository<TasksUsersEntity>,
    private readonly amqpConnection: AmqpConnection
  ) {}

  @RabbitRPC({
    exchange: AssignTaskToUserContract.exchange,
    routingKey: AssignTaskToUserContract.routingKey,
    queue: AssignTaskToUserContract.queue,
    errorBehavior: MessageHandlerErrorBehavior.NACK,
    errorHandler: defaultNackErrorHandler,
    allowNonJsonMessages: true,
    name: 'assign-task-to-user',
  })
  async assingTaskToUser(
    dto: AssignTaskToUserContract.Dto
  ): Promise<AssignTaskToUserContract.Response> {
    const { userId, taskId } = dto;

    const userResult =
      await this.amqpConnection.request<CheckUserContract.Response>({
        exchange: CheckUserContract.exchange,
        routingKey: CheckUserContract.routingKey,
        payload: {
          userId: dto.userId,
        } as CheckUserContract.Dto,
      });

    await handleRpcRequest<CheckUserContract.Response>(
      userResult,
      async (response) => {
        if (!response.exists) {
          throw new NotFoundException('User not found!');
        }
      }
    );

    const taskResult =
      await this.amqpConnection.request<CheckTaskContract.Response>({
        exchange: CheckTaskContract.exchange,
        routingKey: CheckTaskContract.routingKey,
        payload: {
          taskId: dto.taskId,
        } as CheckTaskContract.Dto,
      });

    await handleRpcRequest<CheckTaskContract.Response>(
      taskResult,
      async (response) => {
        if (!response.exists) {
          throw new NotFoundException('Task not found!');
        }
      }
    );

    const existingEntry = await this.tasksUsersRepository.findOne({
      where: {
        userId,
        taskId,
      },
    });

    if (existingEntry) {
      throw new NotFoundException('Task already assigned to user');
    }

    const entry = this.tasksUsersRepository.create({
      userId,
      taskId,
    });

    await this.tasksUsersRepository.save(entry);

    const usersResult =
      await this.amqpConnection.request<GetUsersByIdsContract.Response>({
        exchange: GetUsersByIdsContract.exchange,
        routingKey: GetUsersByIdsContract.routingKey,
        payload: {
          ids: [userId],
        } as GetUsersByIdsContract.Dto,
      });

    const response = await handleRpcRequest(
      usersResult,
      async (response) => response
    );

    await this.amqpConnection.request({
      exchange: CreateActionContract.exchange,
      routingKey: CreateActionContract.routingKey,
      payload: {
        title: `Task ${taskId} assigned to user ${response[0].name}`,
        userId,
        taskId,
      } as CreateActionContract.Dto,
    });

    return {
      success: Boolean(entry),
    };
  }

  @RabbitRPC({
    exchange: UnassignTaskFromUserContract.exchange,
    routingKey: UnassignTaskFromUserContract.routingKey,
    queue: UnassignTaskFromUserContract.queue,
    errorBehavior: MessageHandlerErrorBehavior.NACK,
    errorHandler: defaultNackErrorHandler,
    allowNonJsonMessages: true,
    name: 'unassign-task-from-user',
  })
  async unassingTaskFromUser(
    dto: UnassignTaskFromUserContract.Dto
  ): Promise<UnassignTaskFromUserContract.Response> {
    const { userId, taskId } = dto;

    const entry = await this.tasksUsersRepository.delete({
      userId,
      taskId,
    });

    const usersResult =
      await this.amqpConnection.request<GetUsersByIdsContract.Response>({
        exchange: GetUsersByIdsContract.exchange,
        routingKey: GetUsersByIdsContract.routingKey,
        payload: {
          ids: [userId],
        } as GetUsersByIdsContract.Dto,
      });

    const response = await handleRpcRequest(
      usersResult,
      async (response) => response
    );

    await this.amqpConnection.request({
      exchange: CreateActionContract.exchange,
      routingKey: CreateActionContract.routingKey,
      payload: {
        title: `Task ${taskId} unassigned from user ${response[0].name}`,
        userId,
        taskId,
      } as CreateActionContract.Dto,
    });

    return {
      success: Boolean(entry.affected && entry.affected > 0),
    };
  }

  @RabbitRPC({
    exchange: GetTaskIdsByUserIdContract.exchange,
    routingKey: GetTaskIdsByUserIdContract.routingKey,
    queue: GetTaskIdsByUserIdContract.queue,
    errorBehavior: MessageHandlerErrorBehavior.NACK,
    errorHandler: defaultNackErrorHandler,
    allowNonJsonMessages: true,
    name: 'get-task-ids-by-user-id',
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

    return {
      taskIds: entries.map((entry) => entry.taskId),
    };
  }

  @RabbitRPC({
    exchange: GetUserIdsByTaskIdContract.exchange,
    routingKey: GetUserIdsByTaskIdContract.routingKey,
    queue: GetUserIdsByTaskIdContract.queue,
    errorBehavior: MessageHandlerErrorBehavior.NACK,
    errorHandler: defaultNackErrorHandler,
    allowNonJsonMessages: true,
    name: 'get-user-ids-by-task-id',
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

    return {
      userIds: entries.map((entry) => entry.userId),
    };
  }
}
