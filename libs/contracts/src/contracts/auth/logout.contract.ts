import { Errorable } from '@taskfusion-microservices/types';
import {
  GENERAL_EXCHANGE_NAME,
  AUTH_QUEUE_NAME,
} from '@taskfusion-microservices/constants';
import { IsInt } from 'class-validator';

export namespace LogoutContract {
  export const exchange = GENERAL_EXCHANGE_NAME;

  export const routingKey = `logout`;

  export const queue = `${AUTH_QUEUE_NAME}.${routingKey}`;

  export type Response = Errorable<{
    userId: number;
  }>;

  export class Request {
    @IsInt()
    userId: number;
  }

  export class Dto extends Request {}
}
