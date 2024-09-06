import { Errorable } from '@taskfusion-microservices/types';
import {
  GENERAL_EXCHANGE_NAME,
  AUTH_QUEUE_NAME,
} from '@taskfusion-microservices/constants';
import { IsEmail, IsString } from 'class-validator';

export namespace LoginContract {
  export const exchange = GENERAL_EXCHANGE_NAME;

  export const routingKey = `login`;

  export const queue = `${AUTH_QUEUE_NAME}.${routingKey}`;

  export type Response = Errorable<{
    accessToken: string;
    refreshToken: string;
  }>;

  export class Request {
    @IsEmail()
    email: string;

    @IsString()
    password: string;
  }

  export class Dto extends Request {}
}
