import { Errorable } from '@taskfusion-microservices/types';
import {
  GENERAL_EXCHANGE_NAME,
  PAYMENTS_QUEUE_NAME,
} from '@taskfusion-microservices/constants';
import { IsInt } from 'class-validator';

export namespace CreateCheckoutSessionContract {
  export const exchange = GENERAL_EXCHANGE_NAME;

  export const routingKey = `create-checkout-session`;

  export const queue = `${PAYMENTS_QUEUE_NAME}.${routingKey}`;

  export type Response = Errorable<{
    url: string;
  }>;

  export class Request {
    @IsInt()
    projectId: number;

		@IsInt()
		usdAmount: number;

    @IsInt()
    paymentRequestId: number;
  }

  export class Dto extends Request {}
}
