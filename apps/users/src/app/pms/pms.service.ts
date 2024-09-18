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
    errorBehavior: MessageHandlerErrorBehavior.NACK,
    errorHandler: defaultNackErrorHandler,
    allowNonJsonMessages: true,
    name: 'create-pm',
  })
  async createPm(
    dto: CreatePmContract.Dto
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

    this.logger.log(`Pm ${pm.id} created`);

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
  async checkPm(dto: CheckPmContract.Dto): Promise<CheckPmContract.Response> {
    const pm = await this.pmRepository.findOne({
      where: {
        id: dto.pmId,
      },
    });

    this.logger.log(`Checking if pm exists: ${dto.pmId}`);

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
    dto: CheckPmEmailContract.Dto
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

    this.logger.log(`Checking if pm exists: ${email}`);

    return {
      exists: true,
    };
  }

  async updatePm(pmId: number, pmParams: DeepPartial<PmEntity>) {
    const pm = await this.pmRepository.update({ id: pmId }, pmParams);

    this.logger.log(`Pm ${pmId} updated`);

    return pm;
  }
}
