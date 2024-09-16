import { Errorable } from '@taskfusion-microservices/types';
import {
  GENERAL_EXCHANGE_NAME,
  TASKS_QUEUE_NAME,
} from '@taskfusion-microservices/constants';
import {
  TaskEntity,
  TaskStatus,
  UserEntity,
} from '@taskfusion-microservices/entities';
import { IsEnum } from 'class-validator';

export namespace GetUserTasksByStatusContract {
  export const exchange = GENERAL_EXCHANGE_NAME;

  export const routingKey = `get-user-tasks-by-status`;

  export const queue = `${TASKS_QUEUE_NAME}.${routingKey}`;

  export type Response = Errorable<(TaskEntity & { users: UserEntity[] })[]>;

  export class Request {
    @IsEnum(TaskStatus)
    status: TaskStatus;
  }

  export class Dto extends Request {
    userId: number;
  }
}
