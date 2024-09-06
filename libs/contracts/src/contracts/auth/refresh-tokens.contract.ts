import { Errorable } from '@taskfusion-microservices/types';
import {
  GENERAL_EXCHANGE_NAME,
  AUTH_QUEUE_NAME,
} from '@taskfusion-microservices/constants';
import { IsInt, IsString } from 'class-validator';

export namespace RefreshTokensContract {
  export const exchange = GENERAL_EXCHANGE_NAME;

  export const routingKey = `refresh-tokens`;

  export const queue = `${AUTH_QUEUE_NAME}.${routingKey}`;

  export type Response = Errorable<{
    accessToken: string;
    refreshToken: string;
  }>;

  export class Request {
    @IsInt()
    userId: number;

    @IsString()
    refreshToken: string;
  };

  export class Dto extends Request {}
}
