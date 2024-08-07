import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { Injectable } from '@nestjs/common';
import { GetProfileContract } from '@taskfusion-microservices/contracts';
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
}
