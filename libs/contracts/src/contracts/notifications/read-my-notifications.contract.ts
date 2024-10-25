import {
  GENERAL_EXCHANGE_NAME,
  NOTIFICATIONS_QUEUE_NAME,
} from '@taskfusion-microservices/constants';
import { Errorable } from '@taskfusion-microservices/types';

export namespace ReadMyNotificationsContract {
  export const exchange = GENERAL_EXCHANGE_NAME;

  export const routingKey = `read-my-notifications`;

  export const queue = `${NOTIFICATIONS_QUEUE_NAME}.${routingKey}`;

  export type Response = Errorable<{
    success: boolean;
  }>;

  export class Request {}

  export class Dto extends Request {
    userId: number;
  }
}
