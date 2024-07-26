import {
  Injectable,
  InternalServerErrorException,
  OnModuleInit,
} from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import {
  CreateClientContract,
  CreateDeveloperContract,
  CreatePmContract,
} from '@taskfusion-microservices/contracts';
import { lastValueFrom, timeout } from 'rxjs';

@Injectable()
export class AuthService implements OnModuleInit {
  constructor(
    @Inject('USERS_SERVICE') private readonly kafkaClient: ClientKafka
  ) {}

  async createUser<T, R>(topic: string, dto: T): Promise<R> {
    try {
      const result = await lastValueFrom(
        this.kafkaClient.send<R>(topic, dto).pipe(timeout(5000))
      );

      return result;
    } catch (error) {
      throw new InternalServerErrorException();
    }
  }

  onModuleInit() {
    this.kafkaClient.subscribeToResponseOf(CreateClientContract.topic);
    this.kafkaClient.subscribeToResponseOf(CreateDeveloperContract.topic);
    this.kafkaClient.subscribeToResponseOf(CreatePmContract.topic);
  }
}
