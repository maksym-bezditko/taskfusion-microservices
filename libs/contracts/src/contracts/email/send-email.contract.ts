import {
  EMAIL_QUEUE_NAME,
  GENERAL_EXCHANGE_NAME,
} from '@taskfusion-microservices/constants';
import { IsEmail, IsString } from 'class-validator';

export namespace SendEmailContract {
  export const exchange = GENERAL_EXCHANGE_NAME;

  export const routingKey = `send-email`;

  export const queue = `${EMAIL_QUEUE_NAME}.${routingKey}`;

  export class Request {
    @IsEmail()
    recipientEmail: string;

    @IsString()
    subject: string;

    @IsString()
    message: string;
  }

  export class Dto extends Request {}
}
