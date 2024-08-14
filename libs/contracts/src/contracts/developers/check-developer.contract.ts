import { Errorable } from '@taskfusion-microservices/types';
import {
  GENERAL_EXCHANGE_NAME,
  DEVELOPERS_QUEUE_NAME,
} from '@taskfusion-microservices/constants';
import { IsInt } from 'class-validator';

export namespace CheckDeveloperContract {
  export const exchange = GENERAL_EXCHANGE_NAME;

  export const routingKey = `check-developer`;

  export const queue = `${DEVELOPERS_QUEUE_NAME}.${routingKey}`;

  export type Response = Errorable<{
    exists: boolean;
  }>;

  export class Request {
    @IsInt()
    developerId: number;
  }
}
