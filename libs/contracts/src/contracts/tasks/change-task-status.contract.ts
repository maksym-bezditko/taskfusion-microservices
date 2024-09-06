import { Errorable } from '@taskfusion-microservices/types';
import {
  GENERAL_EXCHANGE_NAME,
  TASKS_QUEUE_NAME,
} from '@taskfusion-microservices/constants';
import { IsEnum, IsInt } from 'class-validator';
import { TaskStatus } from '@taskfusion-microservices/entities';

export namespace ChangeTaskStatusContract {
  export const exchange = GENERAL_EXCHANGE_NAME;

  export const routingKey = `change-task-status`;

  export const queue = `${TASKS_QUEUE_NAME}.${routingKey}`;

  export type Response = Errorable<{
    success: boolean;
  }>;

  export class Request {
    @IsInt()
    taskId: number;

    @IsEnum(TaskStatus)
    taskStatus: TaskStatus;
  }

  export class Dto extends Request {
    userId: number;
  }
}
