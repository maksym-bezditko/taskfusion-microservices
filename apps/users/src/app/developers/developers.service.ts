import { RabbitRPC, MessageHandlerErrorBehavior, defaultNackErrorHandler } from '@golevelup/nestjs-rabbitmq';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateDeveloperContract } from '@taskfusion-microservices/contracts';
import { DeveloperEntity } from '@taskfusion-microservices/entities';
import { Repository } from 'typeorm';
import { UsersService } from '../users/users.service';

@Injectable()
export class DevelopersService {
  constructor(
    @InjectRepository(DeveloperEntity)
    private readonly developerRepository: Repository<DeveloperEntity>,
    private readonly usersService: UsersService
  ) {}

  @RabbitRPC({
    exchange: CreateDeveloperContract.exchange,
    routingKey: CreateDeveloperContract.routingKey,
    queue: CreateDeveloperContract.queue,
    errorBehavior: MessageHandlerErrorBehavior.NACK,
    errorHandler: defaultNackErrorHandler,
    allowNonJsonMessages: true,
    name: 'create-developer',
  })
  async createDeveloper(
    dto: CreateDeveloperContract.Request
  ): Promise<CreateDeveloperContract.Response> {
    const user = await this.usersService.createUser(dto.email, dto.password);

    const client = this.developerRepository.create({
      user,
    });

    await this.developerRepository.save(client);

    return {
      id: user.id,
    };
  }
}
