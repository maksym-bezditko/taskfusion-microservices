import { Errorable } from '@taskfusion-microservices/types';
import {
  GENERAL_EXCHANGE_NAME,
  PROJECTS_QUEUE_NAME,
} from '@taskfusion-microservices/constants';
import { ProjectEntity, UserEntity } from '@taskfusion-microservices/entities';
import { IsInt } from 'class-validator';

export namespace GetClientProjectsContract {
  export const exchange = GENERAL_EXCHANGE_NAME;

  export const routingKey = `get-client-projects`;

  export const queue = `${PROJECTS_QUEUE_NAME}.${routingKey}`;

  export type Response = Errorable<(ProjectEntity & { users: UserEntity[] })[]>;

  export class Request {
    @IsInt()
    clientUserId: number;
  }

  export class Dto extends Request {}
}
