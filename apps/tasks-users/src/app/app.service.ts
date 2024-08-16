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
  GetTaskParticipantsContract,
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
    dto: AssignTaskToUserContract.Request
  ): Promise<AssignTaskToUserContract.Response> {
    const { userId, taskId } = dto;

    const userResult =
      await this.amqpConnection.request<CheckUserContract.Response>({
        exchange: CheckUserContract.exchange,
        routingKey: CheckUserContract.routingKey,
        payload: {
          userId: dto.userId,
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

    const taskResult =
      await this.amqpConnection.request<CheckTaskContract.Response>({
        exchange: CheckTaskContract.exchange,
        routingKey: CheckTaskContract.routingKey,
        payload: {
          taskId: dto.taskId,
        } as CheckTaskContract.Request,
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
    dto: UnassignTaskFromUserContract.Request
  ): Promise<UnassignTaskFromUserContract.Response> {
    const { userId, taskId } = dto;

    const entry = await this.tasksUsersRepository.delete({
      userId,
      taskId,
    });

    return {
      success: Boolean(entry.affected && entry.affected > 0),
    };
  }

  @RabbitRPC({
    exchange: GetTaskParticipantsContract.exchange,
    routingKey: GetTaskParticipantsContract.routingKey,
    queue: GetTaskParticipantsContract.queue,
    errorBehavior: MessageHandlerErrorBehavior.NACK,
    errorHandler: defaultNackErrorHandler,
    allowNonJsonMessages: true,
    name: 'get-task-participants',
  })
  async getTaskParticipants(dto: GetTaskParticipantsContract.Dto) {
    const { taskId } = dto;

    const entries = await this.tasksUsersRepository.find({
      where: {
        taskId,
      },
    });

    const userIds = entries.map((entry) => entry.userId);

    if (userIds.length === 0) {
      return [];
    }

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

    return users;
  }
}
