import { Errorable } from '@taskfusion-microservices/types';
import {
  GENERAL_EXCHANGE_NAME,
  CLIENTS_QUEUE_NAME,
} from '@taskfusion-microservices/constants';
import { IsInt } from 'class-validator';

export namespace CheckClientContract {
  export const exchange = GENERAL_EXCHANGE_NAME;

  export const routingKey = `check-client`;

  export const queue = `${CLIENTS_QUEUE_NAME}.${routingKey}`;

  export type Response = Errorable<{
    exists: boolean;
  }>;

  export class Request {
    @IsInt()
    clientId: number;
  }

  export class Dto extends Request {}
}
