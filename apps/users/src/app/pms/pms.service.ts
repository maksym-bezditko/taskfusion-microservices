import {
  RabbitRPC,
  MessageHandlerErrorBehavior,
  defaultNackErrorHandler,
} from '@golevelup/nestjs-rabbitmq';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  CheckPmContract,
  CreatePmContract,
} from '@taskfusion-microservices/contracts';
import { PmEntity, UserType } from '@taskfusion-microservices/entities';
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
    const user = await this.usersService.createUser({
      email: dto.email,
      password: dto.password,
      user_type: UserType.PM,
      telegram_id: dto.telegramId,
      description: dto.description,
    });

    const pm = this.pmRepository.create({
      user,
    });

    await this.pmRepository.save(pm);

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

  @RabbitRPC({
    exchange: CheckPmContract.exchange,
    routingKey: CheckPmContract.routingKey,
    queue: CheckPmContract.queue,
    errorBehavior: MessageHandlerErrorBehavior.NACK,
    errorHandler: defaultNackErrorHandler,
    allowNonJsonMessages: true,
    name: 'check-pm',
  })
  async checkPm(
    dto: CheckPmContract.Request
  ): Promise<CheckPmContract.Response> {
    const pm = await this.pmRepository.findOne({
      where: {
        id: dto.pm_id,
      },
    });

    return {
      exists: Boolean(pm),
    };
  }
}
