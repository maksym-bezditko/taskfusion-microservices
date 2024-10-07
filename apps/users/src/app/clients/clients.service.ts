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
  async createClientRpcHandler(
    dto: CreateClientContract.Dto
  ): Promise<CreateClientContract.Response> {
    this.logger.log('Creating client');

    return this.createClient(dto);
  }

  private async createClient(dto: CreateClientContract.Dto) {
    const user = await this.createClientUserWithRelation(dto);

    const { accessToken, refreshToken } =
      await this.usersService.generateTokens({
        id: user.id,
        email: user.email,
        userType: user.userType,
      });

    await this.usersService.updateUser(user.id, {
      refreshToken,
    });

    return {
      accessToken,
      refreshToken,
    };
  }

  private async createClientUserWithRelation(dto: CreateClientContract.Dto) {
    const client = await this.createClientEntity();

    const user = await this.usersService.createUser({
      email: dto.email,
      password: dto.password,
      userType: UserType.CLIENT,
      telegramId: dto.telegramId,
      description: dto.description,
      name: dto.name,
      client,
    });

    await this.updateClient(client.id, {
      user,
    });

    return user;
  }

  private async createClientEntity() {
    const client = this.clientRepository.create();

    await this.clientRepository.save(client);

    return client;
  }

  @RabbitRPC({
    exchange: CheckClientContract.exchange,
    routingKey: CheckClientContract.routingKey,
    queue: CheckClientContract.queue,
    errorHandler: defaultNackErrorHandler,
  })
  async checkClientRpcHandler(
    dto: CheckClientContract.Dto
  ): Promise<CheckClientContract.Response> {
    this.logger.log(`Checking if client exists: ${dto.clientId}`);

    return this.checkClient(dto.clientId);
  }

  private async checkClient(clientId: number) {
    const client = await this.clientRepository.findOne({
      where: {
        id: clientId,
      },
    });

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
  async getClientByUserIdRpcHandler(
    dto: GetClientByUserIdContract.Dto
  ): Promise<GetClientByUserIdContract.Response> {
    this.logger.log(`Client by user id: ${dto.userId}`);

    return this.getClientByUserId(dto.userId);
  }

  private async getClientByUserId(clientUserId: number) {
    return this.clientRepository.findOne({
      where: {
        user: {
          id: clientUserId,
        },
      },
    });
  }

  async updateClient(
    clientId: number,
    clientParams: DeepPartial<ClientEntity>
  ) {
    return this.clientRepository.update(
      { id: clientId },
      clientParams
    );
  }
}
