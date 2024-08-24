import { Errorable } from '@taskfusion-microservices/types';
import {
  GENERAL_EXCHANGE_NAME,
  PROJECTS_USERS_QUEUE_NAME,
} from '@taskfusion-microservices/constants';
import { IsEnum, IsInt } from 'class-validator';
import { ProjectParticipantRole } from '@taskfusion-microservices/entities';

export namespace AssignUserToProjectContract {
  export const exchange = GENERAL_EXCHANGE_NAME;

  export const routingKey = `assign-user-to-project`;

  export const queue = `${PROJECTS_USERS_QUEUE_NAME}.${routingKey}`;

  export type Response = Errorable<{
    success: boolean;
  }>;

  export class Request {
    @IsInt()
    projectId: number;

    @IsInt()
    userId: number;

    @IsEnum(ProjectParticipantRole)
    role: ProjectParticipantRole
  }

  export class Dto extends Request {}
}
