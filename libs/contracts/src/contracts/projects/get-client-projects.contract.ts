import { Errorable } from '@taskfusion-microservices/types';
import {
  GENERAL_EXCHANGE_NAME,
  PROJECTS_QUEUE_NAME,
} from '@taskfusion-microservices/constants';
import { ProjectEntity } from '@taskfusion-microservices/entities';

export namespace GetClientProjectsContract {
  export const exchange = GENERAL_EXCHANGE_NAME;

  export const routingKey = `get-client-projects`;

  export const queue = `${PROJECTS_QUEUE_NAME}.${routingKey}`;

  export type Response = Errorable<ProjectEntity[]>;

  export class Dto {
    clientUserId: number;
  }
}
