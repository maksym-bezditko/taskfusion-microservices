import { Errorable } from '@taskfusion-microservices/types';
import {
  GENERAL_EXCHANGE_NAME,
  CLIENTS_QUEUE_NAME,
} from '@taskfusion-microservices/constants';
import { IsEmail, IsString, Length, ValidateIf } from 'class-validator';

export namespace CreateClientContract {
  export const exchange = GENERAL_EXCHANGE_NAME;

  export const routingKey = `create-client`;

  export const queue = `${CLIENTS_QUEUE_NAME}.${routingKey}`;

  export type Response = Errorable<{
    accessToken: string;
    refreshToken: string;
  }>;

  export class Request {
    @IsString()
    name: string;

    @IsEmail()
    email: string;

    @IsString()
    @Length(6)
    password: string;

    @IsString()
    description: string;
  }

  export class Dto extends Request {}
}
