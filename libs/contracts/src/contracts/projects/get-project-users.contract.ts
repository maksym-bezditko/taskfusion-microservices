import { Errorable } from '@taskfusion-microservices/types';
import {
  GENERAL_EXCHANGE_NAME,
  PROJECTS_QUEUE_NAME,
} from '@taskfusion-microservices/constants';
import { UserEntity } from '@taskfusion-microservices/entities';
import { IsInt } from 'class-validator';

export namespace GetProjectUsersContract {
  export const exchange = GENERAL_EXCHANGE_NAME;

  export const routingKey = `get-project-users`;

  export const queue = `${PROJECTS_QUEUE_NAME}.${routingKey}`;

  export type Response = Errorable<UserEntity[]>;

  export class Request {
		@IsInt()
		projectId: number;
  }

  export class Dto extends Request {}
}
