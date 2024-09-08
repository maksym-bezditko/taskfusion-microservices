import {
  AmqpConnection,
  RabbitRPC,
  MessageHandlerErrorBehavior,
  defaultNackErrorHandler,
} from '@golevelup/nestjs-rabbitmq';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  CheckTaskContract,
  GetTasksByStatusContract,
  GetTaskParticipantsContract,
  GetTaskByIdContract,
  ChangeTaskStatusContract,
  GetUsersByIdsContract,
  CreateActionContract,
  CreateTaskContract,
  CheckProjectContract,
  GetUserIdsByTaskIdContract,
  GetUserTasksByStatusContract,
  GetTaskIdsByUserIdContract,
} from '@taskfusion-microservices/contracts';
import { TaskEntity } from '@taskfusion-microservices/entities';
import { handleRpcRequest } from '@taskfusion-microservices/helpers';
import { In, Repository } from 'typeorm';

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(TaskEntity)
    private readonly taskRepository: Repository<TaskEntity>,
    private readonly amqpConnection: AmqpConnection
  ) {}

  @RabbitRPC({
    exchange: CheckTaskContract.exchange,
    routingKey: CheckTaskContract.routingKey,
    queue: CheckTaskContract.queue,
    errorBehavior: MessageHandlerErrorBehavior.NACK,
    errorHandler: defaultNackErrorHandler,
    allowNonJsonMessages: true,
    name: 'check-task',
  })
  async checkTask(
    dto: CheckTaskContract.Dto
  ): Promise<CheckTaskContract.Response> {
    const { taskId } = dto;

    const task = await this.taskRepository.find({
      where: {
        id: taskId,
      },
    });

    return {
      exists: Boolean(task),
    };
  }

  @RabbitRPC({
    exchange: GetTasksByStatusContract.exchange,
    routingKey: GetTasksByStatusContract.routingKey,
    queue: GetTasksByStatusContract.queue,
    errorBehavior: MessageHandlerErrorBehavior.NACK,
    errorHandler: defaultNackErrorHandler,
    allowNonJsonMessages: true,
    name: 'get-tasks-by-status',
  })
  async getTasksByStatus(
    dto: GetTasksByStatusContract.Dto
  ): Promise<GetTasksByStatusContract.Response> {
    const { projectId, taskStatus } = dto;

    const result = await this.taskRepository.find({
      where: {
        projectId,
        taskStatus,
      },
    });

    const tasks = result.map(async (task) => {
      const usersResult =
        await this.amqpConnection.request<GetTaskParticipantsContract.Response>(
          {
            exchange: GetTaskParticipantsContract.exchange,
            routingKey: GetTaskParticipantsContract.routingKey,
            payload: {
              taskId: task.id,
            },
          }
        );

      const users = await handleRpcRequest(
        usersResult,
        async (response) => response
      );

      return {
        ...task,
        users,
      };
    });

    return Promise.all(tasks);
  }

  @RabbitRPC({
    exchange: GetTaskByIdContract.exchange,
    routingKey: GetTaskByIdContract.routingKey,
    queue: GetTaskByIdContract.queue,
    errorBehavior: MessageHandlerErrorBehavior.NACK,
    errorHandler: defaultNackErrorHandler,
    allowNonJsonMessages: true,
    name: 'get-task-by-id',
  })
  async getTaskById(
    dto: GetTaskByIdContract.Dto
  ): Promise<GetTaskByIdContract.Response> {
    const { taskId } = dto;

    const task = await this.taskRepository.findOne({
      where: {
        id: taskId,
      },
    });

    const usersResult =
      await this.amqpConnection.request<GetTaskParticipantsContract.Response>({
        exchange: GetTaskParticipantsContract.exchange,
        routingKey: GetTaskParticipantsContract.routingKey,
        payload: {
          taskId,
        },
      });

    const users = await handleRpcRequest(
      usersResult,
      async (response) => response
    );

    return {
      ...task,
      users,
    };
  }

  @RabbitRPC({
    exchange: ChangeTaskStatusContract.exchange,
    routingKey: ChangeTaskStatusContract.routingKey,
    queue: ChangeTaskStatusContract.queue,
    errorBehavior: MessageHandlerErrorBehavior.NACK,
    errorHandler: defaultNackErrorHandler,
    allowNonJsonMessages: true,
    name: 'change-task-status',
  })
  async changeTaskStatus(
    dto: ChangeTaskStatusContract.Dto
  ): Promise<ChangeTaskStatusContract.Response> {
    const { taskId, taskStatus, userId } = dto;

    const taskBeforeUpdate = await this.taskRepository.findOne({
      where: {
        id: taskId,
      },
    });

    const result = await this.taskRepository.update(
      {
        id: taskId,
      },
      {
        taskStatus,
      }
    );

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
        title: `Task status changed from "${taskBeforeUpdate.taskStatus}" to "${taskStatus}" by ${response[0].name}`,
        userId,
        taskId,
      } as CreateActionContract.Dto,
    });

    return {
      success: Boolean(result.affected && result.affected > 0),
    };
  }

  @RabbitRPC({
    exchange: CreateTaskContract.exchange,
    routingKey: CreateTaskContract.routingKey,
    queue: CreateTaskContract.queue,
    errorBehavior: MessageHandlerErrorBehavior.NACK,
    errorHandler: defaultNackErrorHandler,
    allowNonJsonMessages: true,
    name: 'create-task',
  })
  async createTask(
    dto: CreateTaskContract.Dto
  ): Promise<CreateTaskContract.Response> {
    const {
      deadline,
      description,
      taskPriority,
      projectId,
      taskStatus,
      title,
      userId,
    } = dto;

    const projectResult =
      await this.amqpConnection.request<CheckProjectContract.Response>({
        exchange: CheckProjectContract.exchange,
        routingKey: CheckProjectContract.routingKey,
        payload: {
          projectId,
        } as CheckProjectContract.Dto,
      });

    await handleRpcRequest<CheckProjectContract.Response>(
      projectResult,
      async (response) => {
        if (!response.exists) {
          throw new NotFoundException('Developer not found!');
        }
      }
    );

    const task = this.taskRepository.create({
      title,
      description,
      taskPriority,
      taskStatus,
      deadline: new Date(deadline),
      projectId,
    });

    await this.taskRepository.save(task);

    await this.amqpConnection.request({
      exchange: CreateActionContract.exchange,
      routingKey: CreateActionContract.routingKey,
      payload: {
        title: 'Task created',
        userId,
        taskId: task.id,
      } as CreateActionContract.Dto,
    });

    return task;
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

    const userIdsResult =
      await this.amqpConnection.request<GetUserIdsByTaskIdContract.Response>({
        exchange: GetUserIdsByTaskIdContract.exchange,
        routingKey: GetUserIdsByTaskIdContract.routingKey,
        payload: {
          taskId,
        } as GetUserIdsByTaskIdContract.Dto,
      });

    const { userIds } = await handleRpcRequest(
      userIdsResult,
      async (response) => response
    );

    if (userIds.length === 0) {
      return [];
    }

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

    return users;
  }

  @RabbitRPC({
    exchange: GetUserTasksByStatusContract.exchange,
    routingKey: GetUserTasksByStatusContract.routingKey,
    queue: GetUserTasksByStatusContract.queue,
    errorBehavior: MessageHandlerErrorBehavior.NACK,
    errorHandler: defaultNackErrorHandler,
    allowNonJsonMessages: true,
    name: 'get-user-tasks-by-status',
  })
  async getUserTasksByStatus(
    dto: GetUserTasksByStatusContract.Dto
  ): Promise<GetUserTasksByStatusContract.Response> {
    const { status, userId } = dto;
    
    const taskIdsResult =
      await this.amqpConnection.request<GetTaskIdsByUserIdContract.Response>({
        exchange: GetTaskIdsByUserIdContract.exchange,
        routingKey: GetTaskIdsByUserIdContract.routingKey,
        payload: {
          userId,
        } as GetTaskIdsByUserIdContract.Dto,
      });

    const { taskIds } = await handleRpcRequest(
      taskIdsResult,
      async (response) => response
    );

    if (taskIds.length === 0) {
      return [];
    }

    const tasks = await this.taskRepository.find({
      where: {
        id: In(taskIds),
        taskStatus: status,
      },
    });

    console.log(tasks);

    return tasks;
  }
}
