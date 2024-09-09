import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import {
  AssignTaskToUserContract,
  ChangeTaskStatusContract,
  CreateTaskContract,
  GetTaskByIdContract,
  GetTasksByStatusContract,
  GetUserTasksByStatusContract,
  UnassignTaskFromUserContract,
} from '@taskfusion-microservices/contracts';
import { AtJwtGuard, UserIdFromJwt } from '@taskfusion-microservices/common';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { handleRpcRequest } from '@taskfusion-microservices/helpers';

@Controller('tasks')
export class TasksController {
  constructor(
    private readonly amqpConnection: AmqpConnection
  ) {}

  @UseGuards(AtJwtGuard)
  @Post('create-task')
  async createTask(
    @Body() dto: CreateTaskContract.Request,
    @UserIdFromJwt() userId: number
  ): Promise<CreateTaskContract.Response> {
    const result =
      await this.amqpConnection.request<CreateTaskContract.Response>({
        exchange: CreateTaskContract.exchange,
        routingKey: CreateTaskContract.routingKey,
        payload: {
          ...dto,
          userId,
        } as CreateTaskContract.Dto,
      });

    return handleRpcRequest(result, async (response) => response);
  }

  @UseGuards(AtJwtGuard)
  @Post('assign-task-to-user')
  async assingTaskToUser(
    @Body() dto: AssignTaskToUserContract.Request
  ): Promise<AssignTaskToUserContract.Response> {
    const result =
      await this.amqpConnection.request<AssignTaskToUserContract.Response>({
        exchange: AssignTaskToUserContract.exchange,
        routingKey: AssignTaskToUserContract.routingKey,
        payload: dto as AssignTaskToUserContract.Dto,
      });

    return handleRpcRequest(result, async (response) => response);
  }

  @UseGuards(AtJwtGuard)
  @Post('unassign-task-from-user')
  async unassignTaskFromUser(
    @Body() dto: UnassignTaskFromUserContract.Request
  ): Promise<UnassignTaskFromUserContract.Response> {
    const result =
      await this.amqpConnection.request<UnassignTaskFromUserContract.Response>({
        exchange: UnassignTaskFromUserContract.exchange,
        routingKey: UnassignTaskFromUserContract.routingKey,
        payload: dto as UnassignTaskFromUserContract.Dto,
      });

    return handleRpcRequest(result, async (response) => response);
  }

  @UseGuards(AtJwtGuard)
  @Post('change-task-status')
  async changeTaskStatus(
    @Body() dto: ChangeTaskStatusContract.Request,
    @UserIdFromJwt() userId: number
  ): Promise<ChangeTaskStatusContract.Response> {
    const result =
      await this.amqpConnection.request<ChangeTaskStatusContract.Response>({
        exchange: ChangeTaskStatusContract.exchange,
        routingKey: ChangeTaskStatusContract.routingKey,
        payload: {
          taskId: dto.taskId,
          taskStatus: dto.taskStatus,
          userId,
        } as ChangeTaskStatusContract.Dto,
      });

    return handleRpcRequest(result, async (response) => response);
  }

  @UseGuards(AtJwtGuard)
  @Post('get-user-tasks-by-status')
  async getUserTasksByStatus(
    @Body() dto: GetUserTasksByStatusContract.Request,
    @UserIdFromJwt() userId: number
  ): Promise<GetUserTasksByStatusContract.Response> {
    const result =
      await this.amqpConnection.request<GetUserTasksByStatusContract.Response>({
        exchange: GetUserTasksByStatusContract.exchange,
        routingKey: GetUserTasksByStatusContract.routingKey,
        payload: {
          status: dto.status,
          userId,
        } as GetUserTasksByStatusContract.Dto,
      });

    return handleRpcRequest(result, async (response) => response);
  }

  @UseGuards(AtJwtGuard)
  @Post('get-tasks-by-status')
  async getTasksByStatus(
    @Body() dto: GetTasksByStatusContract.Request
  ): Promise<GetTasksByStatusContract.Response> {
    const result =
      await this.amqpConnection.request<GetTasksByStatusContract.Response>({
        exchange: GetTasksByStatusContract.exchange,
        routingKey: GetTasksByStatusContract.routingKey,
        payload: {
          projectId: dto.projectId,
          taskStatus: dto.taskStatus,
        } as GetTasksByStatusContract.Dto,
      });

    return handleRpcRequest(result, async (response) => response);
  }

  @UseGuards(AtJwtGuard)
  @Get(':taskId')
  async getTaskById(
    @Param('taskId') taskId: string
  ): Promise<GetTaskByIdContract.Response> {
    const result =
      await this.amqpConnection.request<GetTaskByIdContract.Response>({
        exchange: GetTaskByIdContract.exchange,
        routingKey: GetTaskByIdContract.routingKey,
        payload: {
          taskId: +taskId,
        } as GetTaskByIdContract.Dto,
      });

    return handleRpcRequest(result, async (response) => response);
  }
}
