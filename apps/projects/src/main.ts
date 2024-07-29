import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app/app.module';
import { RpcExceptionsFilter } from '@taskfusion-microservices/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  app.useGlobalFilters(new RpcExceptionsFilter('projects'));
  
  await app.init();

  Logger.log(
    `🚀 Projects microservice is initiated!`
  );
}

bootstrap();
