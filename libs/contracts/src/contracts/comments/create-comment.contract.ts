import { Errorable } from '@taskfusion-microservices/types';
import {
  GENERAL_EXCHANGE_NAME,
  COMMENTS_QUEUE_NAME,
} from '@taskfusion-microservices/constants';
import { IsInt, IsString } from 'class-validator';

export namespace CreateCommentContract {
  export const exchange = GENERAL_EXCHANGE_NAME;

  export const routingKey = `create-comment`;

  export const queue = `${COMMENTS_QUEUE_NAME}.${routingKey}`;

  export type Response = Errorable<{
    id: number;
  }>;

  export class Request {
    @IsString()
    text: string;

		@IsInt()
    taskId: number;
  }

  export class Dto extends Request {
    userId: number;
  }
}