import {
  RabbitRPC,
  MessageHandlerErrorBehavior,
  defaultNackErrorHandler,
} from '@golevelup/nestjs-rabbitmq';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateDeveloperContract } from '@taskfusion-microservices/contracts';
import { DeveloperEntity, UserType } from '@taskfusion-microservices/entities';
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
    const user = await this.usersService.createUser({
      email: dto.email,
      password: dto.password,
      user_type: UserType.DEVELOPER,
      telegram_id: dto.telegramId,
      description: dto.description,
    });

    const developer = this.developerRepository.create({
      user,
    });

    await this.developerRepository.save(developer);

    const { accessToken, refreshToken } =
      await this.usersService.generateTokens({
        id: user.id,
        email: user.email,
        user_type: user.user_type,
      });

    await this.usersService.updateRefreshToken(user.id, refreshToken);

    return {
      accessToken,
      refreshToken,
    };
  }
}
