import {
  GENERAL_EXCHANGE_NAME,
  NOTIFICATIONS_QUEUE_NAME,
} from '@taskfusion-microservices/constants';
import { NotificationEntity } from '@taskfusion-microservices/entities';
import { Errorable } from '@taskfusion-microservices/types';

export namespace GetUserNotificationsContract {
  export const exchange = GENERAL_EXCHANGE_NAME;

  export const routingKey = `get-user-notifications`;

  export const queue = `${NOTIFICATIONS_QUEUE_NAME}.${routingKey}`;

  export type Response = Errorable<NotificationEntity[]>;

  export class Request {}

  export class Dto extends Request {
    userId: number;
  }
}
