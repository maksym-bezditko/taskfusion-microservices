import { Errorable } from '@taskfusion-microservices/types';
import {
  GENERAL_EXCHANGE_NAME,
  INVITES_QUEUE_NAME,
} from '@taskfusion-microservices/constants';
import { DeveloperInviteEntity } from '@taskfusion-microservices/entities';
import { IsInt } from 'class-validator';

export namespace GetDeveloperInviteByIdContract {
  export const exchange = GENERAL_EXCHANGE_NAME;

  export const routingKey = `get-developer-invite-by-id`;

  export const queue = `${INVITES_QUEUE_NAME}.${routingKey}`;

  export type Response = Errorable<DeveloperInviteEntity>;

  export class Request {
    @IsInt()
    id: number;
  }

  export class Dto extends Request {}
}
