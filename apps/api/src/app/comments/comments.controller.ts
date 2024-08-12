import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { CommentsService } from './comments.service';
import { AtJwtGuard, UserIdFromJwt } from '@taskfusion-microservices/common';
import {
  CreateCommentContract,
} from '@taskfusion-microservices/contracts';

@Controller('comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @UseGuards(AtJwtGuard)
  @Post('create-comment')
  async createComment(
    @Body() dto: CreateCommentContract.Request,
    @UserIdFromJwt() userId: number
  ): Promise<CreateCommentContract.Response> {
    return this.commentsService.createComment(
      CreateCommentContract.exchange,
      CreateCommentContract.routingKey,
      {
        taskId: dto.taskId,
        text: dto.text,
        userId,
      }
    );
  }

  @UseGuards(AtJwtGuard)
  @Post('get-comments-by-task-id')
  async getCommentsByTaskId(
    @Body() dto: CreateCommentContract.Request,
    @UserIdFromJwt() userId: number
  ): Promise<CreateCommentContract.Response> {
    return this.commentsService.createComment(
      CreateCommentContract.exchange,
      CreateCommentContract.routingKey,
      {
        taskId: dto.taskId,
        text: dto.text,
        userId,
      }
    );
  }
}
