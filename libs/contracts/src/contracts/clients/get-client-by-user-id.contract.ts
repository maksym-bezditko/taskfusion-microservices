import { Errorable } from '@taskfusion-microservices/types';
import {
  GENERAL_EXCHANGE_NAME,
  CLIENTS_QUEUE_NAME,
} from '@taskfusion-microservices/constants';
import { ClientEntity } from '@taskfusion-microservices/entities';
import { IsInt } from 'class-validator';

export namespace GetClientByUserIdContract {
  export const exchange = GENERAL_EXCHANGE_NAME;

  export const routingKey = `get-client-by-user-id`;

  export const queue = `${CLIENTS_QUEUE_NAME}.${routingKey}`;

  export type Response = Errorable<ClientEntity>;

  export class Request {
    @IsInt()
    userId: number;
  }

  export class Dto extends Request {}
}
