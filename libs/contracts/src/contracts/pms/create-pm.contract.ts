import { Errorable } from '@taskfusion-microservices/types';
import {
  GENERAL_EXCHANGE_NAME,
  PMS_QUEUE_NAME,
} from '@taskfusion-microservices/constants';
import { IsEmail, IsString, Length, ValidateIf } from 'class-validator';

export namespace CreatePmContract {
  export const exchange = GENERAL_EXCHANGE_NAME;

  export const routingKey = `create-pm`;

  export const queue = `${PMS_QUEUE_NAME}.${routingKey}`;

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
    @ValidateIf((_, v) => v !== null)
    telegramId: string | null;

    @IsString()
    description: string;
  }
}
