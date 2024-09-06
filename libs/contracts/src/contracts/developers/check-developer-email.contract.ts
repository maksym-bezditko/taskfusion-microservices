import { Errorable } from '@taskfusion-microservices/types';
import {
  GENERAL_EXCHANGE_NAME,
  DEVELOPERS_QUEUE_NAME,
} from '@taskfusion-microservices/constants';
import { IsEmail } from 'class-validator';

export namespace CheckDeveloperEmailContract {
  export const exchange = GENERAL_EXCHANGE_NAME;

  export const routingKey = `check-developer-email`;

  export const queue = `${DEVELOPERS_QUEUE_NAME}.${routingKey}`;

  export type Response = Errorable<{
    exists: true;
  }>;

  export class Request {
    @IsEmail()
    email: string;
  }

  export class Dto extends Request {}
}
