import { RabbitMQModule } from '@golevelup/nestjs-rabbitmq';
import { Module, DynamicModule, Global } from '@nestjs/common';
import { CustomAmqpConnection } from '@taskfusion-microservices/common';
import { GENERAL_EXCHANGE_NAME } from '@taskfusion-microservices/constants';

@Global()
@Module({})
export class RmqDynamicModule {
  static register(): DynamicModule {
    return {
      module: RmqDynamicModule,
      imports: [
        RabbitMQModule.forRoot(RabbitMQModule, {
          uri: 'amqp://admin:admin@192.168.105.3:30007',
          exchanges: [
            {
              name: GENERAL_EXCHANGE_NAME,
              type: 'topic',
              createExchangeIfNotExists: true,
            },
          ],
        }),
      ],
      providers: [
        {
          provide: CustomAmqpConnection,
          useClass: CustomAmqpConnection,
        },
      ],
      exports: [RabbitMQModule, CustomAmqpConnection],
    };
  }
}
