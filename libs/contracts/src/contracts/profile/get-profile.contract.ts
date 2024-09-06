import { Errorable } from '@taskfusion-microservices/types';
import {
  GENERAL_EXCHANGE_NAME,
  PROFILES_QUEUE_NAME,
} from '@taskfusion-microservices/constants';
import { UserEntity } from '@taskfusion-microservices/entities';
import { IsInt } from 'class-validator';

export namespace GetProfileContract {
  export const exchange = GENERAL_EXCHANGE_NAME;

  export const routingKey = `get-profile`;

  export const queue = `${PROFILES_QUEUE_NAME}.${routingKey}`;

  export type Response = Errorable<
    Pick<
      UserEntity,
      | 'email'
      | 'id'
      | 'userType'
      | 'telegramId'
      | 'description'
      | 'name'
      | 'client'
      | 'developer'
      | 'pm'
    >
  >;

  export class Request {
    @IsInt()
    userId: number;
  }

  export class Dto extends Request {}
}
