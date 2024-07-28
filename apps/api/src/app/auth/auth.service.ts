import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { Injectable } from '@nestjs/common';

@Injectable()
export class AuthService {
  constructor(private readonly amqpConnection: AmqpConnection) {}

  async createUser<T, R>(
    exchange: string,
    routingKey: string,
    dto: T
  ): Promise<R> {
    return this.amqpConnection.request<R>({
      exchange,
      routingKey,
      payload: dto,
    });
  }
}
