import { Errorable } from '@taskfusion-microservices/types';
import {
  GENERAL_EXCHANGE_NAME,
  INVITES_QUEUE_NAME,
} from '@taskfusion-microservices/constants';
import { IsInt } from 'class-validator';

export namespace InvitePmContract {
  export const exchange = GENERAL_EXCHANGE_NAME;

  export const routingKey = `invite-pm`;

  export const queue = `${INVITES_QUEUE_NAME}.${routingKey}`;

  export type Response = Errorable<{
    id: number;
  }>;

  export class Request {
    @IsInt()
    pmUserId: number;

    @IsInt()
    projectId: number;
  }

  export class Dto extends Request {
    clientUserId: number;
  }
}
