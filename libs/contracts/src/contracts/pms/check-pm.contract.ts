import { Errorable } from '@taskfusion-microservices/types';
import {
  GENERAL_EXCHANGE_NAME,
  PMS_QUEUE_NAME,
} from '@taskfusion-microservices/constants';
import { IsInt } from 'class-validator';

export namespace CheckPmContract {
  export const exchange = GENERAL_EXCHANGE_NAME;

  export const routingKey = `check-pm`;

  export const queue = `${PMS_QUEUE_NAME}.${routingKey}`;

  export type Response = Errorable<{
    exists: boolean;
  }>;

  export class Request {
    @IsInt()
    pmId: number;
  }

  export class Dto extends Request {}
}
