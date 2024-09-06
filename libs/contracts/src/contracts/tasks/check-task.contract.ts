import { Errorable } from '@taskfusion-microservices/types';
import {
  GENERAL_EXCHANGE_NAME,
  TASKS_QUEUE_NAME,
} from '@taskfusion-microservices/constants';
import { IsInt } from 'class-validator';

export namespace CheckTaskContract {
  export const exchange = GENERAL_EXCHANGE_NAME;

  export const routingKey = `check-task`;

  export const queue = `${TASKS_QUEUE_NAME}.${routingKey}`;

  export type Response = Errorable<{
    exists: boolean;
  }>;

  export class Request {
    @IsInt()
    taskId: number;
  }

  export class Dto extends Request {}
}
