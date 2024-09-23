import { Errorable } from '@taskfusion-microservices/types';
import {
  GENERAL_EXCHANGE_NAME,
  PAYMENTS_QUEUE_NAME,
} from '@taskfusion-microservices/constants';
import { IsInt } from 'class-validator';

export namespace RejectPaymentRequestContract {
  export const exchange = GENERAL_EXCHANGE_NAME;

  export const routingKey = `reject-payment-request`;

  export const queue = `${PAYMENTS_QUEUE_NAME}.${routingKey}`;

  export type Response = Errorable<{
    success: boolean;
  }>;

  export class Request {
    @IsInt()
    paymentRequestId: number;
  }

  export class Dto extends Request {}
}
