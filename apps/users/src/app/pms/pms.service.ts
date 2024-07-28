import { RabbitRPC, MessageHandlerErrorBehavior, defaultNackErrorHandler } from '@golevelup/nestjs-rabbitmq';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CreatePmContract } from '@taskfusion-microservices/contracts';
import { PmEntity } from '@taskfusion-microservices/entities';
import { Repository } from 'typeorm';
import { UsersService } from '../users/users.service';

@Injectable()
export class PmsService {
	constructor(
    @InjectRepository(PmEntity)
    private readonly pmRepository: Repository<PmEntity>,
    private readonly usersService: UsersService
  ) {}

  @RabbitRPC({
    exchange: CreatePmContract.exchange,
    routingKey: CreatePmContract.routingKey,
    queue: CreatePmContract.queue,
    errorBehavior: MessageHandlerErrorBehavior.NACK,
    errorHandler: defaultNackErrorHandler,
    allowNonJsonMessages: true,
    name: 'create-pm',
  })
  async createPm(
    dto: CreatePmContract.Request
  ): Promise<CreatePmContract.Response> {
    const user = await this.usersService.createUser(dto.email, dto.password);

    const pm = this.pmRepository.create({
      user,
    });

    await this.pmRepository.save(pm);

    return {
      id: user.id,
    };
  }
}
