import { Errorable } from '@taskfusion-microservices/types';
import {
  GENERAL_EXCHANGE_NAME,
  TASKS_QUEUE_NAME,
} from '@taskfusion-microservices/constants';
import { IsEnum, IsInt } from 'class-validator';
import {
  TaskEntity,
  TaskStatus,
  UserEntity,
} from '@taskfusion-microservices/entities';

export namespace GetTasksByStatusContract {
  export const exchange = GENERAL_EXCHANGE_NAME;

  export const routingKey = `get-tasks-by-status`;

  export const queue = `${TASKS_QUEUE_NAME}.${routingKey}`;

  export type Response = Errorable<(TaskEntity & { users: UserEntity[] })[]>;

  export class Request {
    @IsInt()
    projectId: number;

    @IsEnum(TaskStatus)
    taskStatus: TaskStatus;
  }
}
