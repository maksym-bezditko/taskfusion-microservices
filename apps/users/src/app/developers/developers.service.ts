import { defaultNackErrorHandler, RabbitRPC } from '@golevelup/nestjs-rabbitmq';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  CheckDeveloperContract,
  CheckDeveloperEmailContract,
  CreateDeveloperContract,
} from '@taskfusion-microservices/contracts';
import { DeveloperEntity, UserType } from '@taskfusion-microservices/entities';
import { DeepPartial, Repository } from 'typeorm';
import { UsersService } from '../users/users.service';
import { BaseService } from '@taskfusion-microservices/common';

@Injectable()
export class DevelopersService extends BaseService {
  constructor(
    @InjectRepository(DeveloperEntity)
    private readonly developerRepository: Repository<DeveloperEntity>,
    private readonly usersService: UsersService
  ) {
    super(DevelopersService.name);
  }

  @RabbitRPC({
    exchange: CreateDeveloperContract.exchange,
    routingKey: CreateDeveloperContract.routingKey,
    queue: CreateDeveloperContract.queue,
    errorHandler: defaultNackErrorHandler,
  })
  async createDeveloperRpcHandler(
    dto: CreateDeveloperContract.Dto
  ): Promise<CreateDeveloperContract.Response> {
    this.logger.log(`Developer created`);

    return this.createDeveloper(dto);
  }

  private async createDeveloper(dto: CreateDeveloperContract.Dto) {
    const user = await this.createDeveloperUserWithRelation(dto);

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

  private async createDeveloperUserWithRelation(
    dto: CreateDeveloperContract.Dto
  ) {
    const developer = await this.createDeveloperEntity();

    const user = await this.usersService.createUser({
      email: dto.email,
      password: dto.password,
      userType: UserType.DEVELOPER,
      telegramId: dto.telegramId,
      description: dto.description,
      name: dto.name,
      developer,
    });

    await this.updateDeveloper(developer.id, {
      user,
    });

    return user;
  }

  private async createDeveloperEntity() {
    const developer = this.developerRepository.create();

    await this.developerRepository.save(developer);

    return developer;
  }

  @RabbitRPC({
    exchange: CheckDeveloperContract.exchange,
    routingKey: CheckDeveloperContract.routingKey,
    queue: CheckDeveloperContract.queue,
    errorHandler: defaultNackErrorHandler,
  })
  async checkDeveloperRpcHandler(
    dto: CheckDeveloperContract.Dto
  ): Promise<CheckDeveloperContract.Response> {
    this.logger.log(`Checking if developer exists: ${dto.developerId}`);

    return this.checkDeveloper(dto.developerId);
  }

  private async checkDeveloper(developerId: number) {
    const developer = await this.developerRepository.findOne({
      where: {
        id: developerId,
      },
    });

    return {
      exists: Boolean(developer),
    };
  }

  @RabbitRPC({
    exchange: CheckDeveloperEmailContract.exchange,
    routingKey: CheckDeveloperEmailContract.routingKey,
    queue: CheckDeveloperEmailContract.queue,
    errorHandler: defaultNackErrorHandler,
  })
  async checkDeveloperEmailRpcHandler(
    dto: CheckDeveloperEmailContract.Dto
  ): Promise<CheckDeveloperEmailContract.Response> {
    this.logger.log(`Checking if developer email exists`);

    return this.checkDeveloperEmail(dto.email);
  }

  private async checkDeveloperEmail(
    email: string
  ): Promise<CheckDeveloperEmailContract.Response> {
    const developerUser = await this.usersService.getUserByEmailOrThrow(email);

    await this.usersService.throwIfUserTypeDoesNotMatch(
      developerUser,
      UserType.DEVELOPER
    );

    return {
      exists: true,
    };
  }

  private async updateDeveloper(
    developerId: number,
    developerParams: DeepPartial<DeveloperEntity>
  ) {
    return this.developerRepository.update(
      { id: developerId },
      developerParams
    );
  }
}
