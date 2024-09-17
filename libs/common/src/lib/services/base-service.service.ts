import { Logger, BadRequestException, HttpException } from '@nestjs/common';

export class BaseService {
  protected readonly logger: Logger;

  constructor(serviceName: string) {
    this.logger = new Logger(serviceName);
  }

  protected logAndThrowError(error: string | Error | HttpException): never {
    if (typeof error === 'string') {
      this.logger.error(error);
      throw new BadRequestException(error);
    }

    if (error instanceof HttpException) {
      this.logger.error(error.message, error.stack);
      throw error;
    }

    if (error instanceof Error) {
      this.logger.error(error.message || 'Unknown error', error.stack);
      throw error;
    }

    this.logger.error('Unknown error');
    throw new Error('Unknown error');
  }
}
