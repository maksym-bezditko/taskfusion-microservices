import { Errorable } from '@taskfusion-microservices/types';
import {
  GENERAL_EXCHANGE_NAME,
  PROJECTS_QUEUE_NAME,
} from '@taskfusion-microservices/constants';
import { ProjectEntity, UserEntity } from '@taskfusion-microservices/entities';
import { IsInt } from 'class-validator';

export namespace GetPmProjectsContract {
  export const exchange = GENERAL_EXCHANGE_NAME;

  export const routingKey = `get-pm-projects`;

  export const queue = `${PROJECTS_QUEUE_NAME}.${routingKey}`;

  export type Response = Errorable<
    (ProjectEntity & { developerUsers: UserEntity[] })[]
  >;

  export class Request {
    @IsInt()
    pmUserId: number;
  }

  export class Dto extends Request {}
}
