import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import {
  AssignTaskToUserContract,
  ChangeTaskPriorityContract,
  ChangeTaskStatusContract,
  CreateTaskContract,
  GetTaskByIdContract,
  GetTasksByStatusContract,
  GetUserTasksByStatusContract,
  UnassignTaskFromUserContract,
  ValidateAccessToTaskContract,
} from '@taskfusion-microservices/contracts';
import {
  AtJwtGuard,
  CustomAmqpConnection,
  UserIdFromJwt,
} from '@taskfusion-microservices/common';

@Controller('tasks')
export class TasksController {
  constructor(private readonly customAmqpConnection: CustomAmqpConnection) {}

  @UseGuards(AtJwtGuard)
  @Post('create-task')
  async createTask(
    @Body() dto: CreateTaskContract.Request,
    @UserIdFromJwt() userId: number
  ): Promise<CreateTaskContract.Response> {
    const payload: CreateTaskContract.Dto = {
      ...dto,
      userId,
    };

    return this.customAmqpConnection.requestOrThrow<CreateTaskContract.Response>(
      CreateTaskContract.routingKey,
      payload
    );
  }

  @UseGuards(AtJwtGuard)
  @Post('assign-task-to-user')
  async assingTaskToUser(
    @Body() dto: AssignTaskToUserContract.Request,
    @UserIdFromJwt() assignerId: number
  ): Promise<AssignTaskToUserContract.Response> {
    return this.customAmqpConnection.requestOrThrow<AssignTaskToUserContract.Response>(
      AssignTaskToUserContract.routingKey,
      {
        ...dto,
        assignerId,
      }
    );
  }

  @UseGuards(AtJwtGuard)
  @Post('unassign-task-from-user')
  async unassignTaskFromUser(
    @Body() dto: UnassignTaskFromUserContract.Request,
    @UserIdFromJwt() unassignerId: number
  ): Promise<UnassignTaskFromUserContract.Response> {
    return this.customAmqpConnection.requestOrThrow<UnassignTaskFromUserContract.Response>(
      UnassignTaskFromUserContract.routingKey,
      {
        ...dto,
        unassignerId,
      }
    );
  }

  @UseGuards(AtJwtGuard)
  @Post('change-task-status')
  async changeTaskStatus(
    @Body() dto: ChangeTaskStatusContract.Request,
    @UserIdFromJwt() userId: number
  ): Promise<ChangeTaskStatusContract.Response> {
    const payload: ChangeTaskStatusContract.Dto = {
      taskId: dto.taskId,
      taskStatus: dto.taskStatus,
      userId,
    };

    return this.customAmqpConnection.requestOrThrow<ChangeTaskStatusContract.Response>(
      ChangeTaskStatusContract.routingKey,
      payload
    );
  }

  @UseGuards(AtJwtGuard)
  @Post('change-task-priority')
  async changeTaskPriority(
    @Body() dto: ChangeTaskPriorityContract.Request,
    @UserIdFromJwt() userId: number
  ): Promise<ChangeTaskPriorityContract.Response> {
    const payload: ChangeTaskPriorityContract.Dto = {
      taskId: dto.taskId,
      taskPriority: dto.taskPriority,
      userId,
    };

    return this.customAmqpConnection.requestOrThrow<ChangeTaskPriorityContract.Response>(
      ChangeTaskPriorityContract.routingKey,
      payload
    );
  }

  @UseGuards(AtJwtGuard)
  @Post('get-user-tasks-by-status')
  async getUserTasksByStatus(
    @Body() dto: GetUserTasksByStatusContract.Request,
    @UserIdFromJwt() userId: number
  ): Promise<GetUserTasksByStatusContract.Response> {
    const payload: GetUserTasksByStatusContract.Dto = {
      status: dto.status,
      userId,
    };

    return this.customAmqpConnection.requestOrThrow<GetUserTasksByStatusContract.Response>(
      GetUserTasksByStatusContract.routingKey,
      payload
    );
  }

  @UseGuards(AtJwtGuard)
  @Post('get-tasks-by-status')
  async getTasksByStatus(
    @Body() dto: GetTasksByStatusContract.Request
  ): Promise<GetTasksByStatusContract.Response> {
    const payload: GetTasksByStatusContract.Dto = {
      projectId: dto.projectId,
      taskStatus: dto.taskStatus,
    };

    return this.customAmqpConnection.requestOrThrow<GetTasksByStatusContract.Response>(
      GetTasksByStatusContract.routingKey,
      payload
    );
  }

  @UseGuards(AtJwtGuard)
  @Get('validate-access-to-task/:taskId')
  async validateAccessToTask(
    @Param('taskId') taskId: number,
    @UserIdFromJwt() userId: number
  ): Promise<ValidateAccessToTaskContract.Response> {
    const payload: ValidateAccessToTaskContract.Dto = {
      taskId: +taskId,
      userId: +userId,
    };

    return this.customAmqpConnection.requestOrThrow<ValidateAccessToTaskContract.Response>(
      ValidateAccessToTaskContract.routingKey,
      payload
    );
  }

  @UseGuards(AtJwtGuard)
  @Get(':taskId')
  async getTaskById(
    @Param('taskId') taskId: string
  ): Promise<GetTaskByIdContract.Response> {
    const payload: GetTaskByIdContract.Dto = {
      taskId: +taskId,
    };

    return this.customAmqpConnection.requestOrThrow<GetTaskByIdContract.Response>(
      GetTaskByIdContract.routingKey,
      payload
    );
  }
}
