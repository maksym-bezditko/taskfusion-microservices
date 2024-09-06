import { Errorable } from '@taskfusion-microservices/types';
import {
  GENERAL_EXCHANGE_NAME,
  PROJECTS_QUEUE_NAME,
} from '@taskfusion-microservices/constants';
import { IsInt } from 'class-validator';

export namespace CheckProjectContract {
  export const exchange = GENERAL_EXCHANGE_NAME;

  export const routingKey = `check-project`;

  export const queue = `${PROJECTS_QUEUE_NAME}.${routingKey}`;

  export type Response = Errorable<{
    exists: boolean;
  }>;

  export class Request {
    @IsInt()
    projectId: number;
  }

  export class Dto extends Request {}
}
