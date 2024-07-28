import { RabbitMQModule } from '@golevelup/nestjs-rabbitmq';
import { Module, DynamicModule, Global } from '@nestjs/common';
import {
  GENERAL_EXCHANGE_NAME,
  USERS_QUEUE_NAME,
  USERS_QUEUE_ROUTING_KEYS,
} from '@taskfusion-microservices/constants';

@Global()
@Module({})
export class RmqDynamicModule {
  static register(): DynamicModule {
    return {
      module: RmqDynamicModule,
      imports: [
        RabbitMQModule.forRoot(RabbitMQModule, {
          uri: 'amqp://admin:admin@localhost:5672',
          exchanges: [
            {
              name: GENERAL_EXCHANGE_NAME,
              type: 'topic',
              createExchangeIfNotExists: true,
            },
          ],
          queues: [
            {
              name: USERS_QUEUE_NAME,
              exchange: GENERAL_EXCHANGE_NAME,
              routingKey: USERS_QUEUE_ROUTING_KEYS,
              createQueueIfNotExists: true,
            },
          ],
        }),
      ],
      exports: [RabbitMQModule],
    };
  }
}
