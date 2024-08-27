import {
  RabbitRPC,
  MessageHandlerErrorBehavior,
  defaultNackErrorHandler,
} from '@golevelup/nestjs-rabbitmq';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  CheckPmContract,
  CheckPmEmailContract,
  CreatePmContract,
} from '@taskfusion-microservices/contracts';
import { PmEntity, UserType } from '@taskfusion-microservices/entities';
import { DeepPartial, Repository } from 'typeorm';
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
    const pm = this.pmRepository.create();

    await this.pmRepository.save(pm);

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
        id: dto.pmId,
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
    errorBehavior: MessageHandlerErrorBehavior.NACK,
    errorHandler: defaultNackErrorHandler,
    allowNonJsonMessages: true,
    name: 'check-pm-email',
  })
  async checkPmEmail(
    dto: CheckPmEmailContract.Request
  ): Promise<CheckPmEmailContract.Response> {
    const { email } = dto;

    const pmUser = await this.usersService.getUserByEmail({
      email,
    });

    if (!pmUser) {
      throw new NotFoundException('User not found');
    }

    if (pmUser.userType !== UserType.PM) {
      throw new BadRequestException('User is not a project manager');
    }

    return {
      exists: true,
    };
  }

  async updatePm(pmId: number, pmParams: DeepPartial<PmEntity>) {
    const pm = await this.pmRepository.update({ id: pmId }, pmParams);

    return pm;
  }
}
