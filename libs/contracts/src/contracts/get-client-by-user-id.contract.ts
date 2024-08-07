import { Errorable } from '@taskfusion-microservices/types';
import {
  GENERAL_EXCHANGE_NAME,
	USERS_QUEUE_NAME,
} from '@taskfusion-microservices/constants';
import { ClientEntity } from '@taskfusion-microservices/entities';

export namespace GetClientByUserIdContract {
  export const exchange = GENERAL_EXCHANGE_NAME;

  export const routingKey = `get-client-by-user-id`;

  export const queue = `${USERS_QUEUE_NAME}.${routingKey}`;

  export type Response = Errorable<ClientEntity>;

  export class Dto {
    userId: number;
  }
}
