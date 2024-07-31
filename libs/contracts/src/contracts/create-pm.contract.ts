import { Errorable } from '@taskfusion-microservices/types';
import {
  GENERAL_EXCHANGE_NAME,
  USERS_QUEUE_NAME,
} from '@taskfusion-microservices/constants';
import { IsEmail, IsString, Length } from 'class-validator';

export namespace CreatePmContract {
  export const exchange = GENERAL_EXCHANGE_NAME;

  export const routingKey = `create-pm`;

  export const queue = `${USERS_QUEUE_NAME}.${routingKey}`;

  export type Response = Errorable<{
    accessToken: string;
    refreshToken: string;
  }>;

  export class Request {
    @IsEmail()
    email: string;

    @IsString()
    @Length(6)
    password: string;
  }
}
