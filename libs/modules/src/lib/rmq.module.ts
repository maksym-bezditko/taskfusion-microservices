import { RabbitMQModule } from '@golevelup/nestjs-rabbitmq';
import { Module, DynamicModule, Global } from '@nestjs/common';
import {
  GENERAL_EXCHANGE_NAME,
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
          defaultRpcTimeout: 3000,
        }),
      ],
      exports: [RabbitMQModule],
    };
  }
}
