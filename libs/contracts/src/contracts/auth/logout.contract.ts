import { Errorable } from '@taskfusion-microservices/types';
import {
  GENERAL_EXCHANGE_NAME,
  USERS_QUEUE_NAME,
} from '@taskfusion-microservices/constants';

export namespace LogoutContract {
  export const exchange = GENERAL_EXCHANGE_NAME;

  export const routingKey = `logout`;

  export const queue = `${USERS_QUEUE_NAME}.${routingKey}`;

  export type Response = Errorable<{
    userId: number;
  }>;

  export type Dto = {
    userId: number;
  };
}
