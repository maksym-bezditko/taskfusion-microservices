import { Errorable } from '@taskfusion-microservices/types';
import {
  GENERAL_EXCHANGE_NAME,
  TASKS_QUEUE_NAME,
} from '@taskfusion-microservices/constants';
import { IsInt } from 'class-validator';

export namespace ValidateAccessToTaskContract {
  export const exchange = GENERAL_EXCHANGE_NAME;

  export const routingKey = `validate-access-to-task`;

  export const queue = `${TASKS_QUEUE_NAME}.${routingKey}`;

  export type Response = Errorable<{
    allowed: boolean
  }>;

  export class Request {}

  export class Dto extends Request {
    userId: number;
    taskId: number
  }
}
