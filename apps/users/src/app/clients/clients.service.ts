import {
  defaultNackErrorHandler,
  MessageHandlerErrorBehavior,
  RabbitRPC,
} from '@golevelup/nestjs-rabbitmq';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  CheckClientContract,
  CreateClientContract,
} from '@taskfusion-microservices/contracts';
import { ClientEntity, UserType } from '@taskfusion-microservices/entities';
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
    const user = await this.usersService.createUser({
      email: dto.email,
      password: dto.password,
      userType: UserType.CLIENT,
      telegramId: dto.telegramId,
      description: dto.description,
      name: dto.name,
    });

    const client = this.clientRepository.create({
      user,
    });

    await this.clientRepository.save(client);

    const { accessToken, refreshToken } =
      await this.usersService.generateTokens({
        id: user.id,
        email: user.email,
        user_type: user.userType,
      });

    await this.usersService.updateRefreshToken(user.id, refreshToken);

    return {
      accessToken,
      refreshToken,
    };
  }

  @RabbitRPC({
    exchange: CheckClientContract.exchange,
    routingKey: CheckClientContract.routingKey,
    queue: CheckClientContract.queue,
    errorBehavior: MessageHandlerErrorBehavior.NACK,
    errorHandler: defaultNackErrorHandler,
    allowNonJsonMessages: true,
    name: 'check-client',
  })
  async checkClient(
    dto: CheckClientContract.Request
  ): Promise<CheckClientContract.Response> {
    const client = await this.clientRepository.findOne({
      where: {
        id: dto.clientId,
      },
    });

    return {
      exists: Boolean(client),
    };
  }
}
