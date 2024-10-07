import { defaultNackErrorHandler, RabbitRPC } from '@golevelup/nestjs-rabbitmq';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  CheckPmContract,
  CheckPmEmailContract,
  CreatePmContract,
} from '@taskfusion-microservices/contracts';
import { PmEntity, UserType } from '@taskfusion-microservices/entities';
import { DeepPartial, Repository } from 'typeorm';
import { UsersService } from '../users/users.service';
import { BaseService } from '@taskfusion-microservices/common';

@Injectable()
export class PmsService extends BaseService {
  constructor(
    @InjectRepository(PmEntity)
    private readonly pmRepository: Repository<PmEntity>,
    private readonly usersService: UsersService
  ) {
    super(PmsService.name);
  }

  @RabbitRPC({
    exchange: CreatePmContract.exchange,
    routingKey: CreatePmContract.routingKey,
    queue: CreatePmContract.queue,
    errorHandler: defaultNackErrorHandler,
  })
  async createPmRpcHandler(
    dto: CreatePmContract.Dto
  ): Promise<CreatePmContract.Response> {
    this.logger.log('Creating pm');

    return this.createPm(dto);
  }

  private async createPm(dto: CreatePmContract.Dto) {
    const user = await this.createPmUserWithRelation(dto);

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

  private async createPmUserWithRelation(dto: CreatePmContract.Dto) {
    const pm = await this.createPmEntity();

    const user = await this.usersService.createUser({
      email: dto.email,
      password: dto.password,
      userType: UserType.PM,
      telegramId: dto.telegramId,
      description: dto.description,
      name: dto.name,
      pm,
    });

    await this.updatePm(pm.id, {
      user,
    });

    return user;
  }

  private async createPmEntity() {
    const pm = this.pmRepository.create();

    await this.pmRepository.save(pm);

    return pm;
  }

  @RabbitRPC({
    exchange: CheckPmContract.exchange,
    routingKey: CheckPmContract.routingKey,
    queue: CheckPmContract.queue,
    errorHandler: defaultNackErrorHandler,
  })
  async checkPmRpcHandler(
    dto: CheckPmContract.Dto
  ): Promise<CheckPmContract.Response> {
    this.logger.log(`Checking if pm exists: ${dto.pmId}`);

    return this.checkPm(dto.pmId);
  }

  private async checkPm(pmId: number) {
    const pm = await this.pmRepository.findOne({
      where: {
        id: pmId,
      },
    });

    return {
      exists: Boolean(pm),
    };
  }

  @RabbitRPC({
    exchange: CheckPmEmailContract.exchange,
    routingKey: CheckPmEmailContract.routingKey,
    queue: CheckPmEmailContract.queue,
    errorHandler: defaultNackErrorHandler,
  })
  async checkPmEmailRpcHandler(
    dto: CheckPmEmailContract.Dto
  ): Promise<CheckPmEmailContract.Response> {
    this.logger.log(`Checking if pm exists: ${dto.email}`);

    return this.checkPmEmail(dto.email);
  }

  private async checkPmEmail(
    email: string
  ): Promise<CheckPmEmailContract.Response> {
    const pmUser = await this.usersService.getUserByEmailOrThrow(email);

    await this.usersService.throwIfUserTypeDoesNotMatch(pmUser, UserType.PM);

    return {
      exists: true,
    };
  }

  async updatePm(pmId: number, pmParams: DeepPartial<PmEntity>) {
    return this.pmRepository.update({ id: pmId }, pmParams);
  }
}
