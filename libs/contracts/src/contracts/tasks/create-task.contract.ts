import { Errorable } from '@taskfusion-microservices/types';
import {
  GENERAL_EXCHANGE_NAME,
  TASKS_QUEUE_NAME,
} from '@taskfusion-microservices/constants';
import { IsDateString, IsEnum, IsInt, IsString } from 'class-validator';
import {
  TaskEntity,
  TaskPriority,
  TaskStatus,
} from '@taskfusion-microservices/entities';

export namespace CreateTaskContract {
  export const exchange = GENERAL_EXCHANGE_NAME;

  export const routingKey = `create-task`;

  export const queue = `${TASKS_QUEUE_NAME}.${routingKey}`;

  export type Response = Errorable<TaskEntity>;

  export class Request {
    @IsString()
    title: string;

    @IsString()
    description: string;

    @IsEnum(TaskPriority)
    taskPriority: TaskPriority;

    @IsEnum(TaskStatus)
    taskStatus: TaskStatus;

    @IsDateString()
    deadline: string;

    @IsInt()
    projectId: number;
  }

  export class Dto extends Request {
    userId: number;
  }
}
