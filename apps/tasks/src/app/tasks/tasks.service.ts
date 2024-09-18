import {
  RabbitRPC,
  MessageHandlerErrorBehavior,
  defaultNackErrorHandler,
} from '@golevelup/nestjs-rabbitmq';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  BaseService,
  CustomAmqpConnection,
} from '@taskfusion-microservices/common';
import {
  CheckTaskContract,
  GetTasksByStatusContract,
  GetTaskParticipantsContract,
  GetTaskByIdContract,
  ChangeTaskStatusContract,
  GetUsersByIdsContract,
  CreateActionContract,
  CreateTaskContract,
  CheckProjectContract,
  GetUserIdsByTaskIdContract,
  GetUserTasksByStatusContract,
  GetTaskIdsByUserIdContract,
  AssignTaskToUserContract,
  UnassignTaskFromUserContract,
  DeleteTaskUserRelation,
  FindTaskUserRelation,
  CreateTaskUserRelation,
} from '@taskfusion-microservices/contracts';
import { TaskEntity } from '@taskfusion-microservices/entities';
import { In, Repository } from 'typeorm';

@Injectable()
export class TasksService extends BaseService {
  constructor(
    @InjectRepository(TaskEntity)
    private readonly taskRepository: Repository<TaskEntity>,
    private readonly customAmqpConnection: CustomAmqpConnection
  ) {
    super(TasksService.name);
  }

  @RabbitRPC({
    exchange: CheckTaskContract.exchange,
    routingKey: CheckTaskContract.routingKey,
    queue: CheckTaskContract.queue,
    errorBehavior: MessageHandlerErrorBehavior.NACK,
    errorHandler: defaultNackErrorHandler,
    allowNonJsonMessages: true,
    name: 'check-task',
  })
  async checkTask(
    dto: CheckTaskContract.Dto
  ): Promise<CheckTaskContract.Response> {
    const { taskId } = dto;

    const task = await this.taskRepository.find({
      where: {
        id: taskId,
      },
    });

    this.logger.log('Checking if task exists');

    return {
      exists: Boolean(task),
    };
  }

  @RabbitRPC({
    exchange: GetTasksByStatusContract.exchange,
    routingKey: GetTasksByStatusContract.routingKey,
    queue: GetTasksByStatusContract.queue,
    errorBehavior: MessageHandlerErrorBehavior.NACK,
    errorHandler: defaultNackErrorHandler,
    allowNonJsonMessages: true,
    name: 'get-tasks-by-status',
  })
  async getTasksByStatus(
    dto: GetTasksByStatusContract.Dto
  ): Promise<GetTasksByStatusContract.Response> {
    const { projectId, taskStatus } = dto;

    const result = await this.taskRepository.find({
      where: {
        projectId,
        taskStatus,
      },
    });

    // todo: fix n + 1 query

    const tasks = result.map(async (task) => {
      const getTaskParticipantsDto: GetTaskParticipantsContract.Dto = {
        taskId: task.id,
      };

      const users =
        await this.customAmqpConnection.requestOrThrow<GetTaskParticipantsContract.Response>(
          GetTaskParticipantsContract.routingKey,
          getTaskParticipantsDto
        );

      return {
        ...task,
        users,
      };
    });

    this.logger.log('Retrieving tasks by status');

    return Promise.all(tasks);
  }

  @RabbitRPC({
    exchange: GetTaskByIdContract.exchange,
    routingKey: GetTaskByIdContract.routingKey,
    queue: GetTaskByIdContract.queue,
    errorBehavior: MessageHandlerErrorBehavior.NACK,
    errorHandler: defaultNackErrorHandler,
    allowNonJsonMessages: true,
    name: 'get-task-by-id',
  })
  async getTaskById(
    dto: GetTaskByIdContract.Dto
  ): Promise<GetTaskByIdContract.Response> {
    const { taskId } = dto;

    const task = await this.taskRepository.findOne({
      where: {
        id: taskId,
      },
    });

    const getTaskParticipantsDto: GetTaskParticipantsContract.Dto = {
      taskId,
    };

    const users =
      await this.customAmqpConnection.requestOrThrow<GetTaskParticipantsContract.Response>(
        GetTaskParticipantsContract.routingKey,
        getTaskParticipantsDto
      );

    this.logger.log('Retrieving task by id');

    return {
      ...task,
      users,
    };
  }

  @RabbitRPC({
    exchange: ChangeTaskStatusContract.exchange,
    routingKey: ChangeTaskStatusContract.routingKey,
    queue: ChangeTaskStatusContract.queue,
    errorBehavior: MessageHandlerErrorBehavior.NACK,
    errorHandler: defaultNackErrorHandler,
    allowNonJsonMessages: true,
    name: 'change-task-status',
  })
  async changeTaskStatus(
    dto: ChangeTaskStatusContract.Dto
  ): Promise<ChangeTaskStatusContract.Response> {
    const { taskId, taskStatus, userId } = dto;

    const taskBeforeUpdate = await this.taskRepository.findOne({
      where: {
        id: taskId,
      },
    });

    const result = await this.taskRepository.update(
      {
        id: taskId,
      },
      {
        taskStatus,
      }
    );

    const getUsersByIdDto: GetUsersByIdsContract.Dto = {
      ids: [userId],
    };

    const users =
      await this.customAmqpConnection.requestOrThrow<GetUsersByIdsContract.Response>(
        GetUsersByIdsContract.routingKey,
        getUsersByIdDto
      );

    const createActionDto: CreateActionContract.Dto = {
      title: `Task status changed from "${taskBeforeUpdate.taskStatus}" to "${taskStatus}" by ${users[0].name}`,
      userId,
      taskId,
    };

    await this.customAmqpConnection.requestOrThrow(
      CreateActionContract.routingKey,
      createActionDto
    );

    this.logger.log(`Task status changed: ${taskId}`);

    return {
      success: Boolean(result.affected && result.affected > 0),
    };
  }

  @RabbitRPC({
    exchange: CreateTaskContract.exchange,
    routingKey: CreateTaskContract.routingKey,
    queue: CreateTaskContract.queue,
    errorBehavior: MessageHandlerErrorBehavior.NACK,
    errorHandler: defaultNackErrorHandler,
    allowNonJsonMessages: true,
    name: 'create-task',
  })
  async createTask(
    dto: CreateTaskContract.Dto
  ): Promise<CreateTaskContract.Response> {
    const {
      deadline,
      description,
      taskPriority,
      projectId,
      taskStatus,
      title,
      userId,
    } = dto;

    const checkProjectDto: CheckProjectContract.Dto = {
      projectId,
    };

    const projectResult =
      await this.customAmqpConnection.requestOrThrow<CheckProjectContract.Response>(
        CheckProjectContract.routingKey,
        checkProjectDto
      );

    if (!projectResult || !projectResult.exists) {
      this.logAndThrowError(new NotFoundException('Project not found!'));
    }

    const task = this.taskRepository.create({
      title,
      description,
      taskPriority,
      taskStatus,
      deadline: new Date(deadline),
      projectId,
    });

    await this.taskRepository.save(task);

    const createActionDto: CreateActionContract.Dto = {
      title: `Task created`,
      userId,
      taskId: task.id,
    };

    await this.customAmqpConnection.requestOrThrow(
      CreateActionContract.routingKey,
      createActionDto
    );

    this.logger.log(`Task created: ${task.id}`);

    return task;
  }

  @RabbitRPC({
    exchange: GetTaskParticipantsContract.exchange,
    routingKey: GetTaskParticipantsContract.routingKey,
    queue: GetTaskParticipantsContract.queue,
    errorBehavior: MessageHandlerErrorBehavior.NACK,
    errorHandler: defaultNackErrorHandler,
    allowNonJsonMessages: true,
    name: 'get-task-participants',
  })
  async getTaskParticipants(dto: GetTaskParticipantsContract.Dto) {
    const { taskId } = dto;

    const getUserIdsByTaskIdDto: GetUserIdsByTaskIdContract.Dto = {
      taskId,
    };

    const { userIds } =
      await this.customAmqpConnection.requestOrThrow<GetUserIdsByTaskIdContract.Response>(
        GetUserIdsByTaskIdContract.routingKey,
        getUserIdsByTaskIdDto
      );

    if (userIds.length === 0) {
      return [];
    }

    const getUsersByIdsDto: GetUsersByIdsContract.Dto = {
      ids: userIds,
    };

    const users =
      await this.customAmqpConnection.requestOrThrow<GetUsersByIdsContract.Response>(
        GetUsersByIdsContract.routingKey,
        getUsersByIdsDto
      );

    this.logger.log(`Retrieving task participants: ${taskId}`);

    return users;
  }

  @RabbitRPC({
    exchange: GetUserTasksByStatusContract.exchange,
    routingKey: GetUserTasksByStatusContract.routingKey,
    queue: GetUserTasksByStatusContract.queue,
    errorBehavior: MessageHandlerErrorBehavior.NACK,
    errorHandler: defaultNackErrorHandler,
    allowNonJsonMessages: true,
    name: 'get-user-tasks-by-status',
  })
  async getUserTasksByStatus(
    dto: GetUserTasksByStatusContract.Dto
  ): Promise<GetUserTasksByStatusContract.Response> {
    const { status, userId } = dto;

    const getTaskIdsByUserIdDto: GetTaskIdsByUserIdContract.Dto = {
      userId,
    };

    const { taskIds } =
      await this.customAmqpConnection.requestOrThrow<GetTaskIdsByUserIdContract.Response>(
        GetTaskIdsByUserIdContract.routingKey,
        getTaskIdsByUserIdDto
      );

    if (taskIds.length === 0) {
      return [];
    }

    const tasks = await this.taskRepository.find({
      where: {
        id: In(taskIds),
        taskStatus: status,
      },
    });

    // todo: fix n + 1 query

    const tasksWithParticipants = tasks.map(async (task) => {
      const getTaskParticipantsDto: GetTaskParticipantsContract.Dto = {
        taskId: task.id,
      };

      const users =
        await this.customAmqpConnection.requestOrThrow<GetTaskParticipantsContract.Response>(
          GetTaskParticipantsContract.routingKey,
          getTaskParticipantsDto
        );

      return {
        ...task,
        users,
      };
    });

    this.logger.log(`Retrieving user tasks by status: ${status}`);

    return Promise.all(tasksWithParticipants);
  }

  @RabbitRPC({
    exchange: AssignTaskToUserContract.exchange,
    routingKey: AssignTaskToUserContract.routingKey,
    queue: AssignTaskToUserContract.queue,
    errorBehavior: MessageHandlerErrorBehavior.NACK,
    errorHandler: defaultNackErrorHandler,
    allowNonJsonMessages: true,
    name: 'assign-task-to-user',
  })
  async assingTaskToUser(
    dto: AssignTaskToUserContract.Dto
  ): Promise<AssignTaskToUserContract.Response> {
    const { userId, taskId } = dto;

    const task = await this.taskRepository.findOne({
      where: {
        id: taskId,
      },
    });

    if (!task) {
      this.logAndThrowError(new NotFoundException('Task not found!'));
    }

    const findTaskUserRelation: FindTaskUserRelation.Dto = {
      taskId,
      userId,
    };

    const existingTaskUserRelation =
      await this.customAmqpConnection.requestOrThrow<FindTaskUserRelation.Response>(
        FindTaskUserRelation.routingKey,
        findTaskUserRelation
      );

    if (existingTaskUserRelation) {
      this.logAndThrowError(
        new NotFoundException('Task already assigned to user')
      );
    }

    const createTaskUserRelation: CreateTaskUserRelation.Dto = {
      taskId,
      userId,
    };

    const taskUserRelation =
      await this.customAmqpConnection.requestOrThrow<CreateTaskUserRelation.Response>(
        CreateTaskUserRelation.routingKey,
        createTaskUserRelation
      );

    const getUsersByIds: GetUsersByIdsContract.Dto = {
      ids: [userId],
    };

    const users =
      await this.customAmqpConnection.requestOrThrow<GetUsersByIdsContract.Response>(
        GetUsersByIdsContract.routingKey,
        getUsersByIds
      );

    const createActionDto: CreateActionContract.Dto = {
      title: `Task ${taskId} assigned to user ${users[0].name}`,
      userId,
      taskId,
    };

    await this.customAmqpConnection.requestOrThrow(
      CreateActionContract.routingKey,
      createActionDto
    );

    this.logger.log(`Task ${taskId} assigned to user ${users[0].name}`);

    return {
      success: Boolean(taskUserRelation),
    };
  }

  @RabbitRPC({
    exchange: UnassignTaskFromUserContract.exchange,
    routingKey: UnassignTaskFromUserContract.routingKey,
    queue: UnassignTaskFromUserContract.queue,
    errorBehavior: MessageHandlerErrorBehavior.NACK,
    errorHandler: defaultNackErrorHandler,
    allowNonJsonMessages: true,
    name: 'unassign-task-from-user',
  })
  async unassingTaskFromUser(
    dto: UnassignTaskFromUserContract.Dto
  ): Promise<UnassignTaskFromUserContract.Response> {
    const { userId, taskId } = dto;

    const deleteTaskUserRelation: DeleteTaskUserRelation.Dto = {
      taskId,
      userId,
    };

    const { success: deleteOperationSuccess } =
      await this.customAmqpConnection.requestOrThrow<DeleteTaskUserRelation.Response>(
        DeleteTaskUserRelation.routingKey,
        deleteTaskUserRelation
      );

    const getUsersByIds: GetUsersByIdsContract.Dto = {
      ids: [userId],
    };

    const users =
      await this.customAmqpConnection.requestOrThrow<GetUsersByIdsContract.Response>(
        GetUsersByIdsContract.routingKey,
        getUsersByIds
      );

    const createActionDto: CreateActionContract.Dto = {
      title: `Task ${taskId} unassigned from user ${users[0].name}`,
      userId,
      taskId,
    };

    await this.customAmqpConnection.requestOrThrow(
      CreateActionContract.routingKey,
      createActionDto
    );

    this.logger.log(`Task ${taskId} unassigned from user ${users[0].name}`);

    return {
      success: deleteOperationSuccess,
    };
  }
}
