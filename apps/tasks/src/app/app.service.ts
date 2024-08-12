import {
  AmqpConnection,
  defaultNackErrorHandler,
  MessageHandlerErrorBehavior,
  RabbitRPC,
} from '@golevelup/nestjs-rabbitmq';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  CheckProjectContract,
  CheckTaskContract,
  CreateActionContract,
  CreateTaskContract,
  GetTaskByIdContract,
  GetTasksByStatusContract,
} from '@taskfusion-microservices/contracts';
import { TaskEntity } from '@taskfusion-microservices/entities';
import { handleRpcRequest } from '@taskfusion-microservices/helpers';
import { Repository } from 'typeorm';

@Injectable()
export class AppService {
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
    dto: CheckTaskContract.Request
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
    dto: GetTasksByStatusContract.Request
  ): Promise<GetTasksByStatusContract.Response> {
    const { projectId, taskStatus } = dto;

    const result = await this.taskRepository.find({
      where: {
        projectId,
        taskStatus,
      },
    });

    return result;
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
    dto: GetTaskByIdContract.Request
  ): Promise<GetTaskByIdContract.Response> {
    const { taskId } = dto;

    const result = await this.taskRepository.findOne({
      where: {
        id: taskId,
      },
    });

    return result;
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
        } as CheckProjectContract.Request,
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
}
