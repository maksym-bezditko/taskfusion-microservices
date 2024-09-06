import {
  GENERAL_EXCHANGE_NAME,
  ACTIONS_QUEUE_NAME,
} from '@taskfusion-microservices/constants';
import { IsInt, IsString } from 'class-validator';

export namespace CreateActionContract {
  export const exchange = GENERAL_EXCHANGE_NAME;

  export const routingKey = `create-action`;

  export const queue = `${ACTIONS_QUEUE_NAME}.${routingKey}`;

  export class Request {
    @IsString()
    title: string;

    @IsInt()
		userId: number;

    @IsInt()
    taskId: number;
  }

  export class Dto extends Request {}
}
