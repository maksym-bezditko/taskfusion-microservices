import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { Injectable } from '@nestjs/common';
import { CreateCommentContract, GetCommentsByTaskIdContract } from '@taskfusion-microservices/contracts';
import { handleRpcRequest } from '@taskfusion-microservices/helpers';

@Injectable()
export class CommentsService {
  constructor(private readonly amqpConnection: AmqpConnection) {}

  async createComment(
    exchange: string,
    routingKey: string,
    dto: CreateCommentContract.Dto
  ): Promise<CreateCommentContract.Response> {
    const result =
      await this.amqpConnection.request<CreateCommentContract.Response>({
        exchange,
        routingKey,
        payload: dto,
      });

    return handleRpcRequest(result, async (response) => response);
  }

  async getCommentsByTaskId(
    exchange: string,
    routingKey: string,
    dto: GetCommentsByTaskIdContract.Dto
  ): Promise<GetCommentsByTaskIdContract.Response> {
    const result =
      await this.amqpConnection.request<GetCommentsByTaskIdContract.Response>({
        exchange,
        routingKey,
        payload: dto,
      });

    return handleRpcRequest(result, async (response) => response);
  }
}
