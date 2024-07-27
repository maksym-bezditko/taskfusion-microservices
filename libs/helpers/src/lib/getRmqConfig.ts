import { RmqOptions, Transport } from '@nestjs/microservices';
import { AmqplibQueueOptions } from '@nestjs/microservices/external/rmq-url.interface';

export type RmqConfigParams = {
  queue: string;
  queueOptions?: AmqplibQueueOptions;
  replyQueue?: string;
};

export const getRmqConfig = (params: RmqConfigParams): RmqOptions => {
  const { queue, queueOptions, replyQueue } = params;

  return {
    transport: Transport.RMQ,
    options: {
      urls: [
        {
          password: 'admin',
          username: 'admin',
          port: 5672,
          vhost: '/',
        },
      ],
      queue,
      queueOptions,
      replyQueue,
    },
  };
};
