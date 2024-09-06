import { Errorable } from '@taskfusion-microservices/types';
import {
  GENERAL_EXCHANGE_NAME,
  DEVELOPERS_QUEUE_NAME,
} from '@taskfusion-microservices/constants';
import { IsEmail, IsString, Length, ValidateIf } from 'class-validator';

export namespace CreateDeveloperContract {
  export const exchange = GENERAL_EXCHANGE_NAME;

  export const routingKey = `create-developer`;

  export const queue = `${DEVELOPERS_QUEUE_NAME}.${routingKey}`;

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

  export class Dto extends Request {}
}
