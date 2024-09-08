import { Errorable } from '@taskfusion-microservices/types';
import { GENERAL_EXCHANGE_NAME } from '@taskfusion-microservices/constants';
import { TASKS_USERS_QUEUE_NAME } from '@taskfusion-microservices/constants';
import { IsInt } from 'class-validator';

export namespace GetTaskIdsByUserIdContract {
  export const exchange = GENERAL_EXCHANGE_NAME;

  export const routingKey = `get-task-ids-by-user-id`;

  export const queue = `${TASKS_USERS_QUEUE_NAME}.${routingKey}`;

  export type Response = Errorable<{
    taskIds: number[];
  }>;

  export class Request {
    @IsInt()
    userId: number;
  }

  export class Dto extends Request {}
}
