import { Errorable } from '@taskfusion-microservices/types';
import {
  GENERAL_EXCHANGE_NAME,
  PAYMENTS_QUEUE_NAME,
} from '@taskfusion-microservices/constants';
import { IsDateString, IsInt, IsString } from 'class-validator';
import { PaymentRequestEntity } from '@taskfusion-microservices/entities';

export namespace CreatePaymentRequestContract {
  export const exchange = GENERAL_EXCHANGE_NAME;

  export const routingKey = `create-payment-request`;

  export const queue = `${PAYMENTS_QUEUE_NAME}.${routingKey}`;

  export type Response = Errorable<PaymentRequestEntity>;

  export class Request {
    @IsInt()
    clientUserId: number;

    @IsInt()
    projectId: number;

    @IsString()
    comment: string;

    @IsInt()
    usdAmount: number;

    @IsDateString()
    paymentPeriodStartDate: string;

    @IsDateString()
    paymentPeriodEndDate: string;
  }

  export class Dto extends Request {}
}
