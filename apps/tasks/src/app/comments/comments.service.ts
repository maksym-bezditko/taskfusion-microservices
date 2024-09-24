import { defaultNackErrorHandler, RabbitRPC } from '@golevelup/nestjs-rabbitmq';
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
import { Repository } from 'typeorm';
import { TasksService } from '../tasks/tasks.service';
import {
  BaseService,
  CustomAmqpConnection,
} from '@taskfusion-microservices/common';

@Injectable()
export class CommentsService extends BaseService {
  constructor(
    @InjectRepository(CommentEntity)
    private readonly commentRepository: Repository<CommentEntity>,
    private readonly customAmqpConnection: CustomAmqpConnection,
    private readonly tasksService: TasksService
  ) {
    super(CommentsService.name);
  }

  @RabbitRPC({
    exchange: CreateCommentContract.exchange,
    routingKey: CreateCommentContract.routingKey,
    queue: CreateCommentContract.queue,
    errorHandler: defaultNackErrorHandler,
  })
  async createComment(
    dto: CreateCommentContract.Dto
  ): Promise<CreateCommentContract.Response> {
    const { taskId, text, userId } = dto;

    const getUserByIdDto: GetUserByIdContract.Dto = {
      id: userId,
    };

    const user =
      await this.customAmqpConnection.requestOrThrow<GetUserByIdContract.Response>(
        GetUserByIdContract.routingKey,
        getUserByIdDto
      );

    if (!user) {
      this.logAndThrowError(new NotFoundException('User not found!'));
    }

    const task = await this.tasksService.getTaskByIdOrThrow(taskId);

    if (!task) {
      this.logAndThrowError(new NotFoundException('Task not found!'));
    }

    const comment = this.commentRepository.create({
      text,
      userId,
      task,
    });

    await this.commentRepository.save(comment);

    const createActionDto: CreateActionContract.Dto = {
      title: `Comment created by ${user.name}`,
      userId,
      taskId,
    };

    await this.customAmqpConnection.requestOrThrow(
      CreateActionContract.routingKey,
      createActionDto
    );

    this.logger.log(`Comment created: ${comment.id}`);

    return { id: comment.id };
  }

  @RabbitRPC({
    exchange: GetCommentsByTaskIdContract.exchange,
    routingKey: GetCommentsByTaskIdContract.routingKey,
    queue: GetCommentsByTaskIdContract.queue,
    errorHandler: defaultNackErrorHandler,
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

    const getUsersByIdsDto: GetUsersByIdsContract.Dto = {
      ids: userIds,
    };

    const users =
      await this.customAmqpConnection.requestOrThrow<GetUsersByIdsContract.Response>(
        GetUsersByIdsContract.routingKey,
        getUsersByIdsDto
      );

    this.logger.log('Retrieving comments by task id');

    return commentsResult.map((comment) => ({
      ...comment,
      user: users.find((user) => user.id === comment.userId),
    }));
  }
}
