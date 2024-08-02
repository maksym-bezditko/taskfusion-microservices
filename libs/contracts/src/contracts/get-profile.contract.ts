import { Errorable } from '@taskfusion-microservices/types';
import {
  GENERAL_EXCHANGE_NAME,
  USERS_QUEUE_NAME,
} from '@taskfusion-microservices/constants';
import { UserEntity } from '@taskfusion-microservices/entities';

export namespace GetProfileContract {
  export const exchange = GENERAL_EXCHANGE_NAME;

  export const routingKey = `get-profile`;

  export const queue = `${USERS_QUEUE_NAME}.${routingKey}`;

  export type Response = Errorable<
    Pick<UserEntity, 'email' | 'id' | 'userType' | 'telegramId' | 'description' | 'name'>
  >;

  export class Dto {
    userId: number;
  }
}