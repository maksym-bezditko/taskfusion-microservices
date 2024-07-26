/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app/app.module';
import { MicroserviceOptions } from '@nestjs/microservices';
import { getKafkaConfig } from '@taskfusion-microservices/helpers';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AppModule,
    getKafkaConfig({
      clientId: 'users',
      groupId: 'users',
      brokers: ['localhost:9092'],
    })
  );

  await app.listen();

  Logger.log(`🚀 Users microservice is initiated!`);
}

bootstrap();
