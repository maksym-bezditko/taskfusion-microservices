import {
  AmqpConnection,
  defaultNackErrorHandler,
  MessageHandlerErrorBehavior,
  RabbitRPC,
} from '@golevelup/nestjs-rabbitmq';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  CheckTaskContract,
  CheckUserContract,
  CreateActionContract,
  CreateCommentContract,
  GetCommentsByTaskIdContract,
  GetUsersByIdsContract,
} from '@taskfusion-microservices/contracts';
import { CommentEntity } from '@taskfusion-microservices/entities';
import { handleRpcRequest } from '@taskfusion-microservices/helpers';
import { Repository } from 'typeorm';

@Injectable()
export class AppService {
  constructor(
    @InjectRepository(CommentEntity)
    private readonly commentRepository: Repository<CommentEntity>,
    private readonly amqpConnection: AmqpConnection
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
      await this.amqpConnection.request<CheckUserContract.Response>({
        exchange: CheckUserContract.exchange,
        routingKey: CheckUserContract.routingKey,
        payload: {
          userId,
        } as CheckUserContract.Request,
      });

    await handleRpcRequest<CheckUserContract.Response>(
      userResult,
      async (response) => {
        if (!response.exists) {
          throw new NotFoundException('User not found!');
        }
      }
    );

    const taskResult =
      await this.amqpConnection.request<CheckTaskContract.Response>({
        exchange: CheckTaskContract.exchange,
        routingKey: CheckTaskContract.routingKey,
        payload: {
          taskId,
        } as CheckTaskContract.Request,
      });

    await handleRpcRequest<CheckTaskContract.Response>(
      taskResult,
      async (response) => {
        if (!response.exists) {
          throw new NotFoundException('Task not found!');
        }
      }
    );

    const comment = this.commentRepository.create({
      text,
      taskId,
      userId,
    });

    await this.commentRepository.save(comment);

    const usersResult =
      await this.amqpConnection.request<GetUsersByIdsContract.Response>({
        exchange: GetUsersByIdsContract.exchange,
        routingKey: GetUsersByIdsContract.routingKey,
        payload: {
          ids: [userId],
        } as GetUsersByIdsContract.Request,
      });

    const response = await handleRpcRequest(
      usersResult,
      async (response) => response
    );

    await this.amqpConnection.request({
      exchange: CreateActionContract.exchange,
      routingKey: CreateActionContract.routingKey,
      payload: {
        title: `Comment created by ${response[0].name}`,
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
        } as GetUsersByIdsContract.Request,
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
