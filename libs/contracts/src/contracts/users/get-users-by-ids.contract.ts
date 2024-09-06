import { Errorable } from '@taskfusion-microservices/types';
import {
  GENERAL_EXCHANGE_NAME,
  USERS_QUEUE_NAME,
} from '@taskfusion-microservices/constants';
import { UserEntity } from '@taskfusion-microservices/entities';
import { IsNumber } from 'class-validator';

export namespace GetUsersByIdsContract {
  export const exchange = GENERAL_EXCHANGE_NAME;

  export const routingKey = `get-users-by-ids`;

  export const queue = `${USERS_QUEUE_NAME}.${routingKey}`;

  export type Response = Errorable<UserEntity[]>;

  export class Request {
    @IsNumber({}, { each: true })
    ids: number[];
  }

  export class Dto extends Request {}
}
