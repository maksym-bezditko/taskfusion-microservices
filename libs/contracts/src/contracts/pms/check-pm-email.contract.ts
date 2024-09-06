import { Errorable } from '@taskfusion-microservices/types';
import {
  GENERAL_EXCHANGE_NAME,
  PMS_QUEUE_NAME,
} from '@taskfusion-microservices/constants';
import { IsEmail } from 'class-validator';

export namespace CheckPmEmailContract {
  export const exchange = GENERAL_EXCHANGE_NAME;

  export const routingKey = `check-pm-email`;

  export const queue = `${PMS_QUEUE_NAME}.${routingKey}`;

  export type Response = Errorable<{
    exists: true;
  }>;

  export class Request {
    @IsEmail()
    email: string;
  }

  export class Dto extends Request {}
}
