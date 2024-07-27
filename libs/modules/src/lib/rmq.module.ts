import { Module, DynamicModule, Global } from '@nestjs/common';
import { ClientsModule } from '@nestjs/microservices';
import {
  getRmqConfig,
  RmqConfigParams,
} from '@taskfusion-microservices/helpers';

type RmqDynamicModuleParams = RmqConfigParams & {
  name: string;
};

@Global()
@Module({})
export class RmqDynamicModule {
  static register(config: RmqDynamicModuleParams): DynamicModule {
    const { name, queue, queueOptions, replyQueue } = config;

    return {
      module: RmqDynamicModule,
      imports: [
        ClientsModule.register([
          {
            name,
            ...getRmqConfig({ queue, queueOptions, replyQueue }),
          },
        ]),
      ],
      exports: [ClientsModule],
    };
  }
}
