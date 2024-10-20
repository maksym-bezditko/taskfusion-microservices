import { RabbitMQConfig, RabbitMQModule } from '@golevelup/nestjs-rabbitmq';
import { Module, DynamicModule, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CustomAmqpConnection } from '@taskfusion-microservices/common';
import { GENERAL_EXCHANGE_NAME } from '@taskfusion-microservices/constants';

@Global()
@Module({})
export class RmqDynamicModule {
  static register(): DynamicModule {
    return {
      module: RmqDynamicModule,
      imports: [
        ConfigModule,
        RabbitMQModule.forRootAsync(RabbitMQModule, {
          imports: [ConfigModule],
          inject: [ConfigService],
          useFactory: (
            configService: ConfigService
          ): RabbitMQConfig | Promise<RabbitMQConfig> => {
            const user = configService.getOrThrow<string>('RABBITMQ_USER');
            const password =
              configService.getOrThrow<string>('RABBITMQ_PASSWORD');
            const host = configService.getOrThrow<string>('RABBITMQ_HOST');
            const port = configService.getOrThrow<string>('RABBITMQ_PORT');

            const uri = `amqp://${user}:${password}@${host}:${port}`;

            return {
              uri,
              exchanges: [
                {
                  name: GENERAL_EXCHANGE_NAME,
                  type: 'topic',
                  createExchangeIfNotExists: true,
                },
              ],
            };
          },
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
