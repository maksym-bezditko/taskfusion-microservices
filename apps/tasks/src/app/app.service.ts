import {
  AmqpConnection,
  defaultNackErrorHandler,
  MessageHandlerErrorBehavior,
  RabbitRPC,
} from '@golevelup/nestjs-rabbitmq';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  CheckDeveloperContract,
  CheckProjectContract,
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
    dto: CreateTaskContract.Request
  ): Promise<CreateTaskContract.Response> {
    const {
      deadline,
      description,
      developerId,
      taskPriority,
      projectId,
      taskStatus,
      title,
    } = dto;

    const developerResult =
      await this.amqpConnection.request<CheckDeveloperContract.Response>({
        exchange: CheckDeveloperContract.exchange,
        routingKey: CheckDeveloperContract.routingKey,
        payload: {
          developerId: dto.developerId,
        } as CheckDeveloperContract.Request,
      });

    await handleRpcRequest<CheckDeveloperContract.Response>(
      developerResult,
      async (response) => {
        if (!response.exists) {
          throw new NotFoundException('Developer not found!');
        }
      }
    );

    const projectResult =
      await this.amqpConnection.request<CheckProjectContract.Response>({
        exchange: CheckProjectContract.exchange,
        routingKey: CheckProjectContract.routingKey,
        payload: {
          projectId: dto.projectId,
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
      developerId,
    });

    await this.taskRepository.save(task);

    return task;
  }
}
