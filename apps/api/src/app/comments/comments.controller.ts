import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AtJwtGuard, UserIdFromJwt } from '@taskfusion-microservices/common';
import {
  CreateCommentContract,
  GetCommentsByTaskIdContract,
} from '@taskfusion-microservices/contracts';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { handleRpcRequest } from '@taskfusion-microservices/helpers';

@Controller('comments')
export class CommentsController {
  constructor(private readonly amqpConnection: AmqpConnection) {}

  @UseGuards(AtJwtGuard)
  @Post('create-comment')
  async createComment(
    @Body() dto: CreateCommentContract.Request,
    @UserIdFromJwt() userId: number
  ): Promise<CreateCommentContract.Response> {
    const result =
      await this.amqpConnection.request<CreateCommentContract.Response>({
        exchange: CreateCommentContract.exchange,
        routingKey: CreateCommentContract.routingKey,
        payload: {
          taskId: dto.taskId,
          text: dto.text,
          userId,
        } as CreateCommentContract.Dto,
      });

    return handleRpcRequest(result, async (response) => response);
  }

  @UseGuards(AtJwtGuard)
  @Get('get-comments-by-task-id/:taskId')
  async getCommentsByTaskId(
    @Param('taskId') taskId: string
  ): Promise<GetCommentsByTaskIdContract.Response> {
    const result =
      await this.amqpConnection.request<GetCommentsByTaskIdContract.Response>({
        exchange: GetCommentsByTaskIdContract.exchange,
        routingKey: GetCommentsByTaskIdContract.routingKey,
        payload: {
          taskId: +taskId,
        } as GetCommentsByTaskIdContract.Dto,
      });

    return handleRpcRequest(result, async (response) => response);
  }
}
