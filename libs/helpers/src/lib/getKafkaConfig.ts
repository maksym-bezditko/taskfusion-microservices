import { NestApplicationContextOptions } from '@nestjs/common/interfaces/nest-application-context-options.interface';
import {
  MicroserviceOptions,
  Transport,
} from '@nestjs/microservices';
import { Partitioners } from 'kafkajs';

export type KafkaConfigParams = {
  clientId: string;
  brokers: string[];
  groupId: string;
};

export const getKafkaConfig = (
  params: KafkaConfigParams
): NestApplicationContextOptions & MicroserviceOptions => {
  const { clientId, brokers, groupId } = params;

  return {
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
  };
};
