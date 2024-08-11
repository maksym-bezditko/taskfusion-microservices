import { Errorable } from '@taskfusion-microservices/types';
import {
  GENERAL_EXCHANGE_NAME,
  ACTIONS_QUEUE_NAME,
} from '@taskfusion-microservices/constants';
import { ActionEntity, UserEntity } from '@taskfusion-microservices/entities';

export namespace GetActionsByTaskIdContract {
  export const exchange = GENERAL_EXCHANGE_NAME;

  export const routingKey = `get-actions-by-task-id`;

  export const queue = `${ACTIONS_QUEUE_NAME}.${routingKey}`;

  export type Response = Errorable<(ActionEntity & { user: UserEntity })[]>;

  export class Request {
    taskId: number;
  }
}
