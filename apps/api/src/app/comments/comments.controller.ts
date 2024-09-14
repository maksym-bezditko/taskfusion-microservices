import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import {
  AtJwtGuard,
  CustomAmqpConnection,
  UserIdFromJwt,
} from '@taskfusion-microservices/common';
import {
  CreateCommentContract,
  GetCommentsByTaskIdContract,
} from '@taskfusion-microservices/contracts';

@Controller('comments')
export class CommentsController {
  constructor(private readonly customAmqpConnection: CustomAmqpConnection) {}

  @UseGuards(AtJwtGuard)
  @Post('create-comment')
  async createComment(
    @Body() dto: CreateCommentContract.Request,
    @UserIdFromJwt() userId: number
  ): Promise<CreateCommentContract.Response> {
    const payload: CreateCommentContract.Dto = {
      taskId: dto.taskId,
      text: dto.text,
      userId,
    };

    return this.customAmqpConnection.requestOrThrow<CreateCommentContract.Response>(
      CreateCommentContract.routingKey,
      payload
    );
  }

  @UseGuards(AtJwtGuard)
  @Get('get-comments-by-task-id/:taskId')
  async getCommentsByTaskId(
    @Param('taskId') taskId: string
  ): Promise<GetCommentsByTaskIdContract.Response> {
    const payload: GetCommentsByTaskIdContract.Dto = {
      taskId: +taskId,
    };

    return this.customAmqpConnection.requestOrThrow<GetCommentsByTaskIdContract.Response>(
      GetCommentsByTaskIdContract.routingKey,
      payload
    );
  }
}
