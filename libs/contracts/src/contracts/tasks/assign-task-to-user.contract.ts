import { Errorable } from '@taskfusion-microservices/types';
import {
  GENERAL_EXCHANGE_NAME,
  TASKS_QUEUE_NAME,
} from '@taskfusion-microservices/constants';
import { IsInt } from 'class-validator';

export namespace AssignTaskToUserContract {
  export const exchange = GENERAL_EXCHANGE_NAME;

  export const routingKey = `assign-task-to-user`;

  export const queue = `${TASKS_QUEUE_NAME}.${routingKey}`;

  export type Response = Errorable<{
    success: boolean;
  }>;

  export class Request {
    @IsInt()
    taskId: number;

    @IsInt()
    userId: number;
  }

  export class Dto extends Request {
    assignerId: number
  }
}
