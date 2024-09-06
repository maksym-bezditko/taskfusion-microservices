import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { Injectable } from '@nestjs/common';
import { LoginContract, LogoutContract, RefreshTokensContract } from '@taskfusion-microservices/contracts';
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

    return handleRpcRequest(result, async (response) => response);
  }

  async refreshTokens(
    exchange: string,
    routingKey: string,
    dto: RefreshTokensContract.Dto
  ) {
    const result =
      await this.amqpConnection.request<RefreshTokensContract.Response>({
        exchange,
        routingKey,
        payload: dto,
      });

    return handleRpcRequest(result, async (response) => response);
  }

  async logout(
    exchange: string,
    routingKey: string,
    dto: LogoutContract.Dto
  ) {
    const result =
      await this.amqpConnection.request<LogoutContract.Response>({
        exchange,
        routingKey,
        payload: dto,
      });

    return handleRpcRequest(result, async (response) => response);
  }

  async login(
    exchange: string,
    routingKey: string,
    dto: LoginContract.Dto
  ) {
    const result =
      await this.amqpConnection.request<LoginContract.Response>({
        exchange,
        routingKey,
        payload: dto,
      });

    return handleRpcRequest(result, async (response) => response);
  }
}
