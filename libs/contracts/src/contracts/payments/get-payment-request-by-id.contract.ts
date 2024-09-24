import { Errorable } from '@taskfusion-microservices/types';
import {
  GENERAL_EXCHANGE_NAME,
  PAYMENTS_QUEUE_NAME,
} from '@taskfusion-microservices/constants';
import {
  PaymentRequestEntity,
  ProjectEntity,
} from '@taskfusion-microservices/entities';

export namespace GetPaymentRequestByIdContract {
  export const exchange = GENERAL_EXCHANGE_NAME;

  export const routingKey = `get-payment-request-by-id`;

  export const queue = `${PAYMENTS_QUEUE_NAME}.${routingKey}`;

  export type Response = Errorable<{
    paymentRequest: PaymentRequestEntity & { project: ProjectEntity };
  }>;

  export class Request {}

  export class Dto extends Request {
    paymentRequestId: number;
  }
}
