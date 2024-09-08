import { Errorable } from '@taskfusion-microservices/types';
import { GENERAL_EXCHANGE_NAME } from '@taskfusion-microservices/constants';
import { TASKS_USERS_QUEUE_NAME } from '@taskfusion-microservices/constants';
import { IsInt } from 'class-validator';

export namespace GetUserIdsByTaskIdContract {
  export const exchange = GENERAL_EXCHANGE_NAME;

  export const routingKey = `get-user-ids-by-test-id`;

  export const queue = `${TASKS_USERS_QUEUE_NAME}.${routingKey}`;

  export type Response = Errorable<{
    userIds: number[];
  }>;

  export class Request {
    @IsInt()
    taskId: number;
  }

  export class Dto extends Request {}
}
