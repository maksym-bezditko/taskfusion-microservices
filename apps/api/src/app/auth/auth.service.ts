import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { ClientProxy, ClientRMQ } from '@nestjs/microservices';
import { lastValueFrom, timeout } from 'rxjs';

@Injectable()
export class AuthService {
  constructor(
    @Inject('USERS_SERVICE') private readonly usersRmqClient: ClientProxy
  ) {}

  async createUser<T, R>(topic: string, dto: T): Promise<R> {
    try {
      const response = await lastValueFrom(
        this.usersRmqClient.send<R>(topic, dto).pipe(timeout(5000))
      );

      return response;
    } catch (error) {
      throw new InternalServerErrorException();
    }
  }
}
