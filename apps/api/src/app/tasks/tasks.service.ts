import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { Injectable } from '@nestjs/common';
import {
  CreateTaskContract,
  GetTaskByIdContract,
  GetTasksByStatusContract,
} from '@taskfusion-microservices/contracts';
import { handleRpcRequest } from '@taskfusion-microservices/helpers';

@Injectable()
export class TasksService {
  constructor(private readonly amqpConnection: AmqpConnection) {}

  async createTask(
    exchange: string,
    routingKey: string,
    dto: CreateTaskContract.Request
  ) {
    const result =
      await this.amqpConnection.request<CreateTaskContract.Response>({
        exchange,
        routingKey,
        payload: dto,
      });

    return handleRpcRequest(result, async (response) => response);
  }

  async getTasksByStatus(
    exchange: string,
    routingKey: string,
    dto: GetTasksByStatusContract.Request
  ) {
    const result =
      await this.amqpConnection.request<GetTasksByStatusContract.Response>({
        exchange,
        routingKey,
        payload: dto,
      });

    return handleRpcRequest(result, async (response) => response);
  }

  async getTaskById(
    exchange: string,
    routingKey: string,
    dto: GetTaskByIdContract.Request
  ) {
    const result =
      await this.amqpConnection.request<GetTaskByIdContract.Response>({
        exchange,
        routingKey,
        payload: dto,
      });

    return handleRpcRequest(result, async (response) => response);
  }
}
