import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { Injectable } from '@nestjs/common';
import { CreateProjectContract } from '@taskfusion-microservices/contracts';
import { handleRpcRequest } from '@taskfusion-microservices/helpers';

@Injectable()
export class ProjectsService {
  constructor(private readonly amqpConnection: AmqpConnection) {}

  async createProject(
    exchange: string,
    routingKey: string,
    dto: CreateProjectContract.Request
  ): Promise<CreateProjectContract.Response> {
    const result =
      await this.amqpConnection.request<CreateProjectContract.Response>({
        exchange,
        routingKey,
        payload: dto,
      });

    return handleRpcRequest(result, async (response) => response);
  }
}
