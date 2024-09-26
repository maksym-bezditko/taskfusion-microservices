/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app/app.module';
import { RpcExceptionsFilter } from '@taskfusion-microservices/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    rawBody: true,
  });

  app.useGlobalFilters(new RpcExceptionsFilter('payments'));

  await app.listen(4242);

  Logger.log(`🚀 Payments microservice is initiated!`);
}

bootstrap();
