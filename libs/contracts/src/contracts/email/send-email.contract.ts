import {
	EMAIL_QUEUE_NAME,
  GENERAL_EXCHANGE_NAME,
} from '@taskfusion-microservices/constants';

export namespace SendEmailContract {
  export const exchange = GENERAL_EXCHANGE_NAME;

  export const routingKey = `send-email`;

  export const queue = `${EMAIL_QUEUE_NAME}.${routingKey}`;

  export class Dto {
    recipientEmail: string;
		subject: string;
		message: string;
  }
}