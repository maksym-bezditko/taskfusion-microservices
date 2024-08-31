import { Errorable } from '@taskfusion-microservices/types';
import {
  GENERAL_EXCHANGE_NAME,
  INVITES_QUEUE_NAME,
} from '@taskfusion-microservices/constants';
import { PmInviteEntity } from '@taskfusion-microservices/entities';

export namespace GetPmInviteByIdContract {
  export const exchange = GENERAL_EXCHANGE_NAME;

  export const routingKey = `get-pm-invite-by-id`;

  export const queue = `${INVITES_QUEUE_NAME}.${routingKey}`;

  export type Response = Errorable<PmInviteEntity>;

  export class Request {
    id: number;
  }

  export class Dto extends Request {}
}
