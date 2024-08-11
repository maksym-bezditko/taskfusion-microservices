import {
  GENERAL_EXCHANGE_NAME,
  ACTIONS_QUEUE_NAME,
} from '@taskfusion-microservices/constants';

export namespace CreateActionContract {
  export const exchange = GENERAL_EXCHANGE_NAME;

  export const routingKey = `create-action`;

  export const queue = `${ACTIONS_QUEUE_NAME}.${routingKey}`;

  export class Dto {
    title: string;
		userId: number;
    taskId: number;
  }
}
