import { Errorable } from '@taskfusion-microservices/types';
import { GENERAL_EXCHANGE_NAME, TASKS_QUEUE_NAME } from '@taskfusion-microservices/constants';
import { UserEntity } from '@taskfusion-microservices/entities';
import { IsInt } from 'class-validator';

export namespace GetTaskParticipantsContract {
  export const exchange = GENERAL_EXCHANGE_NAME;

  export const routingKey = `get-task-participants`;

  export const queue = `${TASKS_QUEUE_NAME}.${routingKey}`;

  export type Response = Errorable<UserEntity[]>;

  export class Request {
    @IsInt()
    taskId: number;
  }

  export class Dto extends Request {}
}
