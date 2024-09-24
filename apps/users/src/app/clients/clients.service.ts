import { defaultNackErrorHandler, RabbitRPC } from '@golevelup/nestjs-rabbitmq';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  CheckClientContract,
  CreateClientContract,
  GetClientByUserIdContract,
} from '@taskfusion-microservices/contracts';
import { ClientEntity, UserType } from '@taskfusion-microservices/entities';
import { DeepPartial, Repository } from 'typeorm';
import { UsersService } from '../users/users.service';
import { BaseService } from '@taskfusion-microservices/common';

@Injectable()
export class ClientsService extends BaseService {
  constructor(
    @InjectRepository(ClientEntity)
    private readonly clientRepository: Repository<ClientEntity>,
    private readonly usersService: UsersService
  ) {
    super(ClientsService.name);
  }

  @RabbitRPC({
    exchange: CreateClientContract.exchange,
    routingKey: CreateClientContract.routingKey,
    queue: CreateClientContract.queue,
    errorHandler: defaultNackErrorHandler,
  })
  async createClient(
    dto: CreateClientContract.Dto
  ): Promise<CreateClientContract.Response> {
    const client = this.clientRepository.create();

    await this.clientRepository.save(client);

    const user = await this.usersService.createUser({
      email: dto.email,
      password: dto.password,
      userType: UserType.CLIENT,
      telegramId: dto.telegramId,
      description: dto.description,
      name: dto.name,
      client,
    });

    await this.updateClients(client.id, {
      user,
    });

    const { accessToken, refreshToken } =
      await this.usersService.generateTokens({
        id: user.id,
        email: user.email,
        userType: user.userType,
      });

    await this.usersService.updateUser(user.id, {
      refreshToken,
    });

    this.logger.log(`Client ${client.id} created`);

    return {
      accessToken,
      refreshToken,
    };
  }

  @RabbitRPC({
    exchange: CheckClientContract.exchange,
    routingKey: CheckClientContract.routingKey,
    queue: CheckClientContract.queue,
    errorHandler: defaultNackErrorHandler,
  })
  async checkClient(
    dto: CheckClientContract.Dto
  ): Promise<CheckClientContract.Response> {
    const client = await this.clientRepository.findOne({
      where: {
        id: dto.clientId,
      },
    });

    this.logger.log(`Checking if client exists: ${dto.clientId}`);

    return {
      exists: Boolean(client),
    };
  }

  @RabbitRPC({
    exchange: GetClientByUserIdContract.exchange,
    routingKey: GetClientByUserIdContract.routingKey,
    queue: GetClientByUserIdContract.queue,
    errorHandler: defaultNackErrorHandler,
  })
  async getClientByUserId(
    dto: GetClientByUserIdContract.Dto
  ): Promise<GetClientByUserIdContract.Response> {
    const client = await this.clientRepository.findOne({
      where: {
        user: {
          id: dto.userId,
        },
      },
    });

    this.logger.log(`Client by user id: ${dto.userId}`);

    return client;
  }

  async updateClients(
    clientId: number,
    clientParams: DeepPartial<ClientEntity>
  ) {
    const client = await this.clientRepository.update(
      { id: clientId },
      clientParams
    );

    this.logger.log(`Updated client: ${clientId}`);

    return client;
  }
}
