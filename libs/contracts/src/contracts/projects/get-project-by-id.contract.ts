import { Errorable } from '@taskfusion-microservices/types';
import {
  GENERAL_EXCHANGE_NAME,
  PROJECTS_QUEUE_NAME,
} from '@taskfusion-microservices/constants';
import { ProjectEntity } from '@taskfusion-microservices/entities';
import { IsInt } from 'class-validator';

export namespace GetProjectByIdContract {
  export const exchange = GENERAL_EXCHANGE_NAME;

  export const routingKey = `get-project-by-id`;

  export const queue = `${PROJECTS_QUEUE_NAME}.${routingKey}`;

  export type Response = Errorable<ProjectEntity>;

  export class Request {
    @IsInt()
		projectId: number;
  }

  export class Dto extends Request {}
}
