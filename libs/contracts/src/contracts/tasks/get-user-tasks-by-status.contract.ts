import { Errorable } from '@taskfusion-microservices/types';
import {
  GENERAL_EXCHANGE_NAME,
  TASKS_QUEUE_NAME,
} from '@taskfusion-microservices/constants';
import { TaskEntity, TaskStatus } from '@taskfusion-microservices/entities';
import { IsEnum } from 'class-validator';

export namespace GetUserTasksByStatusContract {
  export const exchange = GENERAL_EXCHANGE_NAME;

  export const routingKey = `get-user-tasks-by-status`;

  export const queue = `${TASKS_QUEUE_NAME}.${routingKey}`;

  export type Response = Errorable<TaskEntity[]>;

  export class Request {
    @IsEnum(TaskStatus)
    status: TaskStatus;
  }

  export class Dto extends Request {
    userId: number;
  }
}
