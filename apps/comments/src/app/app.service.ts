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
  CreateCommentContract,
} from '@taskfusion-microservices/contracts';
import { CommentEntity } from '@taskfusion-microservices/entities';
import { handleRpcRequest } from '@taskfusion-microservices/helpers';
import { Repository } from 'typeorm';

@Injectable()
export class AppService {
  constructor(
    @InjectRepository(CommentEntity)
    private readonly userRepository: Repository<CommentEntity>,
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

    const comment = this.userRepository.create({
      text,
      taskId,
      userId,
    });

    await this.userRepository.save(comment);

    return { id: comment.id };
  }
}
