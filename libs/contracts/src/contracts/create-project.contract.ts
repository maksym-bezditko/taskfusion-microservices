import { Errorable } from '@taskfusion-microservices/types';
import {
  GENERAL_EXCHANGE_NAME,
  PROJECTS_QUEUE_NAME,
} from '@taskfusion-microservices/constants';
import { IsDateString, IsInt, IsString, ValidateIf } from 'class-validator';

export namespace CreateProjectContract {
  export const exchange = GENERAL_EXCHANGE_NAME;

  export const routingKey = `create-project`;

  export const queue = `${PROJECTS_QUEUE_NAME}.${routingKey}`;

  export type Response = Errorable<{
    id: number;
  }>;

  export class Request {
    @IsString()
    title: string;

    @IsString()
    description: string;

    @IsInt()
    @ValidateIf((object) => object.pmId !== null)
    pmId: number | null;

    @IsInt()
    clientId: number;

    @IsDateString()
    deadline: string;
  }
}