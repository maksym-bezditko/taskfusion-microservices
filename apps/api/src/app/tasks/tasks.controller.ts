import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { TasksService } from './tasks.service';
import {
  CreateTaskContract,
  GetTaskByIdContract,
  GetTasksByStatusContract,
} from '@taskfusion-microservices/contracts';
import { AtJwtGuard } from '@taskfusion-microservices/common';

@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @UseGuards(AtJwtGuard)
  @Post('create-task')
  async createTask(
    @Body() dto: CreateTaskContract.Request
  ): Promise<CreateTaskContract.Response> {
    return this.tasksService.createTask(
      CreateTaskContract.exchange,
      CreateTaskContract.routingKey,
      dto
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
}
