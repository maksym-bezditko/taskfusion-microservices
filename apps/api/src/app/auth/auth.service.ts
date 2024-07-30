import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { Injectable } from '@nestjs/common';
import { handleRpcRequest } from '@taskfusion-microservices/helpers';

@Injectable()
export class AuthService {
  constructor(private readonly amqpConnection: AmqpConnection) {}

  async createUser<T, R>(
    exchange: string,
    routingKey: string,
    dto: T
  ): Promise<R> {
    const result = await this.amqpConnection.request<R>({
      exchange,
      routingKey,
      payload: dto,
    });

    return handleRpcRequest<R, R>(result, async (response) => response);
  }
}
