import { Errorable } from '@taskfusion-microservices/types';
import {
  GENERAL_EXCHANGE_NAME,
  PROJECTS_QUEUE_NAME,
} from '@taskfusion-microservices/constants';

export namespace ValidateAccessToProjectContract {
  export const exchange = GENERAL_EXCHANGE_NAME;

  export const routingKey = `validate-access-to-project`;

  export const queue = `${PROJECTS_QUEUE_NAME}.${routingKey}`;

  export type Response = Errorable<{
    allowed: boolean;
  }>;

  export class Request {}

  export class Dto extends Request {
    userId: number;
    projectId: number;
  }
}
