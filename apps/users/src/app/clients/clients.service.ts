import {
  defaultNackErrorHandler,
  MessageHandlerErrorBehavior,
  RabbitRPC,
} from '@golevelup/nestjs-rabbitmq';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateClientContract } from '@taskfusion-microservices/contracts';
import { ClientEntity } from '@taskfusion-microservices/entities';
import { Repository } from 'typeorm';
import { UsersService } from '../users/users.service';

@Injectable()
export class ClientsService {
  constructor(
    @InjectRepository(ClientEntity)
    private readonly clientRepository: Repository<ClientEntity>,
    private readonly usersService: UsersService
  ) {}

  @RabbitRPC({
    exchange: CreateClientContract.exchange,
    routingKey: CreateClientContract.routingKey,
    queue: CreateClientContract.queue,
    errorBehavior: MessageHandlerErrorBehavior.NACK,
    errorHandler: defaultNackErrorHandler,
    allowNonJsonMessages: true,
    name: 'create-client',
  })
  async createClient(
    dto: CreateClientContract.Request
  ): Promise<CreateClientContract.Response> {
    const user = await this.usersService.createUser(dto.email, dto.password);

    const client = this.clientRepository.create({
      user,
    });

    await this.clientRepository.save(client);

    return {
      id: user.id,
    };
  }
}
