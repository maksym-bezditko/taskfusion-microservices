import { Module, DynamicModule, Global } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { KafkaConfigParams } from '@taskfusion-microservices/helpers';
import { Partitioners } from 'kafkajs';

type KafkaDynamicModuleParams = KafkaConfigParams & {
  name: string;
};

@Global()
@Module({})
export class KafkaDynamicModule {
  static register(config: KafkaDynamicModuleParams): DynamicModule {
    const { name, clientId, brokers, groupId } = config;

    return {
      module: KafkaDynamicModule,
      imports: [
        ClientsModule.register([
          {
            name,
            transport: Transport.KAFKA,
            options: {
              client: {
                clientId,
                brokers,
              },
              producer: {
                createPartitioner: Partitioners.LegacyPartitioner,
              },
              consumer: {
                allowAutoTopicCreation: true,
                groupId,
              },
            },
          },
        ]),
      ],
      exports: [ClientsModule],
    };
  }
}
