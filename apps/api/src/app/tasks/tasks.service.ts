import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { Injectable } from '@nestjs/common';
import {
  AssignTaskToUserContract,
  ChangeTaskStatusContract,
  CreateTaskContract,
  GetTaskByIdContract,
  GetTasksByStatusContract,
  GetUserTasksByStatusContract,
  UnassignTaskFromUserContract,
} from '@taskfusion-microservices/contracts';
import { handleRpcRequest } from '@taskfusion-microservices/helpers';

@Injectable()
export class TasksService {
  constructor(private readonly amqpConnection: AmqpConnection) {}

  async createTask(
    exchange: string,
    routingKey: string,
    dto: CreateTaskContract.Dto
  ) {
    const result =
      await this.amqpConnection.request<CreateTaskContract.Response>({
        exchange,
        routingKey,
        payload: dto,
      });

    return handleRpcRequest(result, async (response) => response);
  }

  async getTaskById(
    exchange: string,
    routingKey: string,
    dto: GetTaskByIdContract.Dto
  ) {
    const result =
      await this.amqpConnection.request<GetTaskByIdContract.Response>({
        exchange,
        routingKey,
        payload: dto,
      });

    return handleRpcRequest(result, async (response) => response);
  }

  async assingTaskToUser(
    exchange: string,
    routingKey: string,
    dto: AssignTaskToUserContract.Dto
  ) {
    const result =
      await this.amqpConnection.request<AssignTaskToUserContract.Response>({
        exchange,
        routingKey,
        payload: dto,
      });

    return handleRpcRequest(result, async (response) => response);
  }

  async unassignTaskFromUser(
    exchange: string,
    routingKey: string,
    dto: UnassignTaskFromUserContract.Dto
  ) {
    const result =
      await this.amqpConnection.request<UnassignTaskFromUserContract.Response>({
        exchange,
        routingKey,
        payload: dto,
      });

    return handleRpcRequest(result, async (response) => response);
  }

  async changeTaskStatus(
    exchange: string,
    routingKey: string,
    dto: ChangeTaskStatusContract.Dto
  ) {
    const result =
      await this.amqpConnection.request<ChangeTaskStatusContract.Response>({
        exchange,
        routingKey,
        payload: dto,
      });

    return handleRpcRequest(result, async (response) => response);
  }

  async getUserTasksByStatus(
    exchange: string,
    routingKey: string,
    dto: GetUserTasksByStatusContract.Dto
  ) {
    const result =
      await this.amqpConnection.request<GetUserTasksByStatusContract.Response>({
        exchange,
        routingKey,
        payload: dto,
      });

    return handleRpcRequest(result, async (response) => response);
  }

  async getTasksByStatus(
    exchange: string,
    routingKey: string,
    dto: GetTasksByStatusContract.Dto
  ) {
    const result =
      await this.amqpConnection.request<GetTasksByStatusContract.Response>({
        exchange,
        routingKey,
        payload: dto,
      });

    return handleRpcRequest(result, async (response) => response);
  }
}
