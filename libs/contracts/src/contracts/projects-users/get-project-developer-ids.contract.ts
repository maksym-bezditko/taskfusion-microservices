import { Errorable } from '@taskfusion-microservices/types';
import {
  GENERAL_EXCHANGE_NAME,
  PROJECTS_USERS_QUEUE_NAME,
} from '@taskfusion-microservices/constants';
import { IsInt } from 'class-validator';

export namespace GetProjectDeveloperIdsContract {
  export const exchange = GENERAL_EXCHANGE_NAME;

  export const routingKey = `get-project-developer-ids`;

  export const queue = `${PROJECTS_USERS_QUEUE_NAME}.${routingKey}`;

  export type Response = Errorable<{
    developerUserIds: number[];
  }>;

  export class Request {
    @IsInt()
    projectId: number;
  }

  export class Dto extends Request {}
}
