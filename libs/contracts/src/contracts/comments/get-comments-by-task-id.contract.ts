import { Errorable } from '@taskfusion-microservices/types';
import {
  GENERAL_EXCHANGE_NAME,
  COMMENTS_QUEUE_NAME,
} from '@taskfusion-microservices/constants';
import { CommentEntity, UserEntity } from '@taskfusion-microservices/entities';

export namespace GetCommentsByTaskIdContract {
  export const exchange = GENERAL_EXCHANGE_NAME;

  export const routingKey = `get-comments-by-task-id`;

  export const queue = `${COMMENTS_QUEUE_NAME}.${routingKey}`;

  export type Response = Errorable<(CommentEntity & { user: UserEntity })[]>;

  export class Dto {
    taskId: number;
  }
}
