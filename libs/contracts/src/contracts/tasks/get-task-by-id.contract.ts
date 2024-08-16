import { Errorable } from '@taskfusion-microservices/types';
import {
  GENERAL_EXCHANGE_NAME,
  TASKS_QUEUE_NAME,
} from '@taskfusion-microservices/constants';
import { IsInt } from 'class-validator';
import { TaskEntity, UserEntity } from '@taskfusion-microservices/entities';

export namespace GetTaskByIdContract {
  export const exchange = GENERAL_EXCHANGE_NAME;

  export const routingKey = `get-task-by-id`;

  export const queue = `${TASKS_QUEUE_NAME}.${routingKey}`;

  export type Response = Errorable<(TaskEntity & { users: UserEntity[] })>;

  export class Request {
    @IsInt()
    taskId: number;
  }
}
