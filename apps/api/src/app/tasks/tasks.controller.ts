import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { TasksService } from './tasks.service';
import {
  AssignTaskToUserContract,
  ChangeTaskStatusContract,
  CreateTaskContract,
  GetTaskByIdContract,
  GetTasksByStatusContract,
  UnassignTaskFromUserContract,
} from '@taskfusion-microservices/contracts';
import { AtJwtGuard, UserIdFromJwt } from '@taskfusion-microservices/common';

@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @UseGuards(AtJwtGuard)
  @Post('create-task')
  async createTask(
    @Body() dto: CreateTaskContract.Request,
    @UserIdFromJwt() userId: number
  ): Promise<CreateTaskContract.Response> {
    return this.tasksService.createTask(
      CreateTaskContract.exchange,
      CreateTaskContract.routingKey,
      {
        ...dto,
        userId,
      }
    );
  }

  @UseGuards(AtJwtGuard)
  @Post('get-tasks-by-status')
  async getTasksByStatus(
    @Body() dto: GetTasksByStatusContract.Request
  ): Promise<GetTasksByStatusContract.Response> {
    return this.tasksService.getTasksByStatus(
      GetTasksByStatusContract.exchange,
      GetTasksByStatusContract.routingKey,
      dto
    );
  }

  @UseGuards(AtJwtGuard)
  @Post('assign-task-to-user')
  async assingTaskToUser(
    @Body() dto: AssignTaskToUserContract.Request
  ): Promise<AssignTaskToUserContract.Response> {
    return this.tasksService.assingTaskToUser(
      AssignTaskToUserContract.exchange,
      AssignTaskToUserContract.routingKey,
      dto
    );
  }

  @UseGuards(AtJwtGuard)
  @Post('unassign-task-from-user')
  async unassignTaskFromUser(
    @Body() dto: UnassignTaskFromUserContract.Request
  ): Promise<UnassignTaskFromUserContract.Response> {
    return this.tasksService.unassignTaskFromUser(
      UnassignTaskFromUserContract.exchange,
      UnassignTaskFromUserContract.routingKey,
      dto
    );
  }

  @UseGuards(AtJwtGuard)
  @Get(':taskId')
  async getTaskById(
    @Param('taskId') taskId: string
  ): Promise<GetTaskByIdContract.Response> {
    return this.tasksService.getTaskById(
      GetTaskByIdContract.exchange,
      GetTaskByIdContract.routingKey,
      {
        taskId: +taskId,
      }
    );
  }

  @UseGuards(AtJwtGuard)
  @Post('change-task-status')
  async changeTaskStatus(
    @Body() dto: ChangeTaskStatusContract.Request,
    @UserIdFromJwt() userId: number
  ): Promise<ChangeTaskStatusContract.Response> {
    return this.tasksService.changeTaskStatus(
      ChangeTaskStatusContract.exchange,
      ChangeTaskStatusContract.routingKey,
      {
        taskId: dto.taskId,
        taskStatus: dto.taskStatus,
        userId,
      }
    );
  }
}
