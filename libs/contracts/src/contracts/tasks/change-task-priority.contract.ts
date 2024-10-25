import { Errorable } from '@taskfusion-microservices/types';
import {
  GENERAL_EXCHANGE_NAME,
  TASKS_QUEUE_NAME,
} from '@taskfusion-microservices/constants';
import { IsEnum, IsInt } from 'class-validator';
import { TaskPriority } from '@taskfusion-microservices/entities';

export namespace ChangeTaskPriorityContract {
  export const exchange = GENERAL_EXCHANGE_NAME;

  export const routingKey = `change-task-priority`;

  export const queue = `${TASKS_QUEUE_NAME}.${routingKey}`;

  export type Response = Errorable<{
    success: boolean;
  }>;

  export class Request {
    @IsInt()
    taskId: number;

    @IsEnum(TaskPriority)
    taskPriority: TaskPriority;
  }

  export class Dto extends Request {
    userId: number;
  }
}
