import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { Injectable } from '@nestjs/common';
import { CreateProjectContract } from '@taskfusion-microservices/contracts';

@Injectable()
export class ProjectsService {
  constructor(private readonly amqpConnection: AmqpConnection) {}

  async createProject(
    exchange: string,
    routingKey: string,
    dto: CreateProjectContract.Request
  ): Promise<CreateProjectContract.Response> {
    return this.amqpConnection.request<CreateProjectContract.Response>({
      exchange,
      routingKey,
      payload: dto,
    });
  }
}
