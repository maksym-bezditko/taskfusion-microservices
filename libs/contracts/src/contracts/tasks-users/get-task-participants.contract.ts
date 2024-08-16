import { Errorable } from '@taskfusion-microservices/types';
import { GENERAL_EXCHANGE_NAME } from '@taskfusion-microservices/constants';
import { UserEntity } from '@taskfusion-microservices/entities';
import { TASKS_USERS_QUEUE_NAME } from '@taskfusion-microservices/constants';

export namespace GetTaskParticipantsContract {
  export const exchange = GENERAL_EXCHANGE_NAME;

  export const routingKey = `get-task-participants`;

  export const queue = `${TASKS_USERS_QUEUE_NAME}.${routingKey}`;

  export type Response = Errorable<UserEntity[]>;

  export class Dto {
    taskId: number;
  }
}
