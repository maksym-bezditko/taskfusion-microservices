import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { Injectable } from '@nestjs/common';
import { GetActionsByTaskIdContract } from '@taskfusion-microservices/contracts';
import { handleRpcRequest } from '@taskfusion-microservices/helpers';

@Injectable()
export class ActionsService {
  constructor(private readonly amqpConnection: AmqpConnection) {}

  async getActionsByTaskId(
    exchange: string,
    routingKey: string,
    dto: GetActionsByTaskIdContract.Request
  ): Promise<GetActionsByTaskIdContract.Response> {
    const result =
      await this.amqpConnection.request<GetActionsByTaskIdContract.Response>({
        exchange,
        routingKey,
        payload: dto,
      });

    return handleRpcRequest(result, async (response) => response);
  }
}
