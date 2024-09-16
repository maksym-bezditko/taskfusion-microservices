import {
  HttpException,
  Injectable,
  InternalServerErrorException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { GENERAL_EXCHANGE_NAME } from '@taskfusion-microservices/constants';
import { isError } from '@taskfusion-microservices/types';

@Injectable()
export class CustomAmqpConnection implements OnModuleInit {
  private readonly logger = new Logger(CustomAmqpConnection.name);

  constructor(private readonly amqpConnection: AmqpConnection) {}

  async requestOrThrow<R, P = unknown>(
    routingKey: string,
    payload: P
  ): Promise<R> {
    return this.makeRequestHandleErrorsAndCheckForRpcResultErrors<R>(
      routingKey,
      payload
    );
  }

  private async makeRequestHandleErrorsAndCheckForRpcResultErrors<R>(
    routingKey: string,
    payload: unknown
  ) {
    const response = await this.makeRequestHandleErrors<R>(routingKey, payload);

    await this.checkForRpcResultErrors(response);

    return response;
  }

  private async makeRequestHandleErrors<R>(
    routingKey: string,
    payload: unknown
  ) {
    try {
      const response = await this.makeRequest<R>(routingKey, payload);

      return response;
    } catch (e) {
      this.checkErrorTypeAndThrow(e);
    }
  }

  private async makeRequest<R>(
    routingKey: string,
    payload: unknown
  ): Promise<R> {
    this.logger.log(
      `Custom call: Requesting ${routingKey} with payload ${JSON.stringify(
        payload
      )}`
    );

    const response = await this.amqpConnection.request<R>({
      exchange: GENERAL_EXCHANGE_NAME,
      routingKey,
      payload,
      timeout: 3000,
    });

    this.logger.log(`Custom call: Response ${JSON.stringify(response)}`);

    return response;
  }

  private async checkForRpcResultErrors(response: unknown) {
    if (isError(response)) {
      this.logger.error(response.error);

      throw new HttpException(
        response?.error || 'Internal server error',
        response?.status || 500
      );
    }
  }

  async publishOrThrow<P = unknown>(routingKey: string, payload: P) {
    try {
      await this.publish<P>(routingKey, payload);
    } catch (e) {
      this.checkErrorTypeAndThrow(e);
    }
  }

  private async publish<P = unknown>(routingKey: string, payload: P) {
    this.logger.log(
      `Custom call: Publishing ${routingKey} with payload ${JSON.stringify(
        payload
      )}`
    );

    await this.amqpConnection.publish(
      GENERAL_EXCHANGE_NAME,
      routingKey,
      payload
    );

    this.logger.log(`Custom call: Published ${routingKey}`);
  }

  private checkErrorTypeAndThrow(error: unknown): never {
    if (error instanceof Error) {
      this.logMessageAndThrowError(error.message);
    }

    this.logger.error(error);
    throw new InternalServerErrorException(error);
  }

  private logMessageAndThrowError(message: string): never {
    this.logger.error(message);
    throw new InternalServerErrorException(message);
  }

  onModuleInit() {
    this.logger.log('Custom AMQP connection initialized');
  }
}
