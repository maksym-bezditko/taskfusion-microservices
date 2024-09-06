import {
  AmqpConnection,
  defaultNackErrorHandler,
  MessageHandlerErrorBehavior,
  RabbitRPC,
} from '@golevelup/nestjs-rabbitmq';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  CreateCommentContract,
  CreateActionContract,
  GetUserByIdContract,
  GetCommentsByTaskIdContract,
  GetUsersByIdsContract,
} from '@taskfusion-microservices/contracts';
import { CommentEntity } from '@taskfusion-microservices/entities';
import { handleRpcRequest } from '@taskfusion-microservices/helpers';
import { Repository } from 'typeorm';
import { TasksService } from '../tasks/tasks.service';

@Injectable()
export class CommentsService {
  constructor(
    @InjectRepository(CommentEntity)
    private readonly commentRepository: Repository<CommentEntity>,
    private readonly amqpConnection: AmqpConnection,
    private readonly tasksService: TasksService
  ) {}

  @RabbitRPC({
    exchange: CreateCommentContract.exchange,
    routingKey: CreateCommentContract.routingKey,
    queue: CreateCommentContract.queue,
    errorBehavior: MessageHandlerErrorBehavior.NACK,
    errorHandler: defaultNackErrorHandler,
    allowNonJsonMessages: true,
    name: 'create-comment',
  })
  async createComment(
    dto: CreateCommentContract.Dto
  ): Promise<CreateCommentContract.Response> {
    const { taskId, text, userId } = dto;

    const userResult =
      await this.amqpConnection.request<GetUserByIdContract.Response>({
        exchange: GetUserByIdContract.exchange,
        routingKey: GetUserByIdContract.routingKey,
        payload: {
          id: userId,
        } as GetUserByIdContract.Dto,
      });

    const user = await handleRpcRequest(
      userResult,
      async (response) => response
    );

    if (!user) {
      throw new NotFoundException('User not found!');
    }

    const task = await this.tasksService.getTaskById({
      taskId,
    });

    if (!task) {
      throw new NotFoundException('Task not found!');
    }

    const comment = this.commentRepository.create({
      text,
      userId,
      task,
    });

    await this.commentRepository.save(comment);

    await this.amqpConnection.request({
      exchange: CreateActionContract.exchange,
      routingKey: CreateActionContract.routingKey,
      payload: {
        title: `Comment created by ${user.name}`,
        userId,
        taskId,
      } as CreateActionContract.Dto,
    });

    return { id: comment.id };
  }

  @RabbitRPC({
    exchange: GetCommentsByTaskIdContract.exchange,
    routingKey: GetCommentsByTaskIdContract.routingKey,
    queue: GetCommentsByTaskIdContract.queue,
    errorBehavior: MessageHandlerErrorBehavior.NACK,
    errorHandler: defaultNackErrorHandler,
    allowNonJsonMessages: true,
    name: 'get-comments-by-task-id',
  })
  async getCommentsByTaskId(
    dto: GetCommentsByTaskIdContract.Dto
  ): Promise<GetCommentsByTaskIdContract.Response> {
    const { taskId } = dto;

    const commentsResult = await this.commentRepository.find({
      where: { taskId },
      order: { createdAt: 'DESC' },
    });

    const userIds = commentsResult.map((action) => action.userId);

    const usersResult =
      await this.amqpConnection.request<GetUsersByIdsContract.Response>({
        exchange: GetUsersByIdsContract.exchange,
        routingKey: GetUsersByIdsContract.routingKey,
        payload: {
          ids: userIds,
        } as GetUsersByIdsContract.Dto,
      });

    const users = await handleRpcRequest(
      usersResult,
      async (response) => response
    );

    return commentsResult.map((comment) => ({
      ...comment,
      user: users.find((user) => user.id === comment.userId),
    }));
  }
}
