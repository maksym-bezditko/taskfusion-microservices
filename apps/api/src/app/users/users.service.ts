import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { Injectable } from '@nestjs/common';
import { CheckPmEmailContract, GetProfileContract } from '@taskfusion-microservices/contracts';
import { handleRpcRequest } from '@taskfusion-microservices/helpers';

@Injectable()
export class UsersService {
  constructor(private readonly amqpConnection: AmqpConnection) {}

	async getProfile(
    exchange: string,
    routingKey: string,
    dto: GetProfileContract.Dto
  ): Promise<GetProfileContract.Response> {
    const result = await this.amqpConnection.request<GetProfileContract.Response>({
      exchange,
      routingKey,
      payload: dto,
    });

    return handleRpcRequest(result, async (response) => response);
  }

  async checkPmEmail(
    exchange: string,
    routingKey: string,
    dto: CheckPmEmailContract.Request
  ): Promise<CheckPmEmailContract.Response> {
    const result = await this.amqpConnection.request<CheckPmEmailContract.Response>({
      exchange,
      routingKey,
      payload: dto,
    });

    return handleRpcRequest(result, async (response) => response);
  }
}
