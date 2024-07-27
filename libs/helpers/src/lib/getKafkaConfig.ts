import {
  KafkaOptions,
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
): KafkaOptions => {
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
