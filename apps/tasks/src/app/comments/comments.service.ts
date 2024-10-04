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
import { DeepPartial, Repository } from 'typeorm';
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
  async createCommentRpcHandler(
    dto: CreateCommentContract.Dto
  ): Promise<CreateCommentContract.Response> {
    this.logger.log(`Comment created`);

    return this.createComment(dto);
  }

  private async createComment(dto: CreateCommentContract.Dto) {
    const { taskId, text, userId } = dto;

    const user = await this.getUserByIdOrThrow(userId);

    const task = await this.tasksService.getTaskByIdOrThrow(taskId);

    const comment = await this.saveCommentEntity({
      text,
      userId,
      task,
    });

    await this.createAction({
      title: `Comment created by ${user.name}`,
      userId,
      taskId,
    });

    this.logger.log(`Comment created: ${comment.id}`);

    return { id: comment.id };
  }

  private async getUserByIdOrThrow(userId: number) {
    const user = await this.getUserById(userId);

    if (!user) {
      this.logAndThrowError(new NotFoundException('User not found'));
    }

    return user;
  }

  private async getUserById(userId: number) {
    const dto: GetUserByIdContract.Dto = {
      id: userId,
    };

    const user =
      await this.customAmqpConnection.requestOrThrow<GetUserByIdContract.Response>(
        GetUserByIdContract.routingKey,
        dto
      );

    return user;
  }

  private async saveCommentEntity(comment: DeepPartial<CommentEntity>) {
    const commentEntity = this.commentRepository.create(comment);

    return this.commentRepository.save(commentEntity);
  }

  private async createAction(dto: CreateActionContract.Dto) {
    return this.customAmqpConnection.requestOrThrow(
      CreateActionContract.routingKey,
      dto
    );
  }

  @RabbitRPC({
    exchange: GetCommentsByTaskIdContract.exchange,
    routingKey: GetCommentsByTaskIdContract.routingKey,
    queue: GetCommentsByTaskIdContract.queue,
    errorHandler: defaultNackErrorHandler,
  })
  async getCommentsByTaskIdRpcHandler(
    dto: GetCommentsByTaskIdContract.Dto
  ): Promise<GetCommentsByTaskIdContract.Response> {
    this.logger.log('Retrieving comments by task id');

    return this.getCommentsWithUserByTaskId(dto);
  }

  private async getCommentsWithUserByTaskId(
    dto: GetCommentsByTaskIdContract.Dto
  ) {
    const { taskId } = dto;

    const commentsResult = await this.getCommentsByTaskId(taskId);

    const userIds = commentsResult.map((action) => action.userId);
    const users = await this.getUsersByIds(userIds);

    const getCommentsWithUser = commentsResult.map((comment) => ({
      ...comment,
      user: users.find((user) => user.id === comment.userId),
    }));

    return getCommentsWithUser;
  }

  private async getCommentsByTaskId(taskId: number) {
    return this.commentRepository.find({
      where: { taskId },
      order: { createdAt: 'DESC' },
    });
  }

  private async getUsersByIds(userIds: number[]) {
    const dto: GetUsersByIdsContract.Dto = {
      ids: userIds,
    };

    const users =
      await this.customAmqpConnection.requestOrThrow<GetUsersByIdsContract.Response>(
        GetUsersByIdsContract.routingKey,
        dto
      );

    return users;
  }
}
