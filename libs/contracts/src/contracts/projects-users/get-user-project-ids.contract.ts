import { Errorable } from '@taskfusion-microservices/types';
import {
  GENERAL_EXCHANGE_NAME,
  PROJECTS_USERS_QUEUE_NAME,
} from '@taskfusion-microservices/constants';

export namespace GetUserProjectIdsContract {
  export const exchange = GENERAL_EXCHANGE_NAME;

  export const routingKey = `get-user-project-ids`;

  export const queue = `${PROJECTS_USERS_QUEUE_NAME}.${routingKey}`;

  export type Response = Errorable<number[]>;

  export class Dto {
    userId: number;
  }
}
