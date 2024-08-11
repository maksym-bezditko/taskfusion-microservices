import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { UserEntity, UserType } from '@taskfusion-microservices/entities';
import { DeepPartial, In, Repository } from 'typeorm';
import bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import {
  CheckUserContract,
  GetProfileContract,
  GetUsersByIdsContract,
  LoginContract,
  LogoutContract,
  RefreshTokensContract,
} from '@taskfusion-microservices/contracts';
import {
  defaultNackErrorHandler,
  MessageHandlerErrorBehavior,
  RabbitRPC,
} from '@golevelup/nestjs-rabbitmq';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService
  ) {}

  @RabbitRPC({
    exchange: GetUsersByIdsContract.exchange,
    routingKey: GetUsersByIdsContract.routingKey,
    queue: GetUsersByIdsContract.queue,
    errorBehavior: MessageHandlerErrorBehavior.NACK,
    errorHandler: defaultNackErrorHandler,
    allowNonJsonMessages: true,
    name: 'get-users-by-ids',
  })
  async getUsersByIds(
    dto: GetUsersByIdsContract.Request
  ): Promise<GetUsersByIdsContract.Response> {
    const { ids } = dto;

    const users = await this.userRepository.find({
      where: { id: In(ids) },
      select: [
        'id',
        'name',
        'email',
        'description',
        'userType',
        'telegramId',
        'createdAt',
        'updatedAt',
      ],
    });

    return users;
  }

  @RabbitRPC({
    exchange: CheckUserContract.exchange,
    routingKey: CheckUserContract.routingKey,
    queue: CheckUserContract.queue,
    errorBehavior: MessageHandlerErrorBehavior.NACK,
    errorHandler: defaultNackErrorHandler,
    allowNonJsonMessages: true,
    name: 'check-user',
  })
  async checkUser(
    dto: CheckUserContract.Request
  ): Promise<CheckUserContract.Response> {
    const user = await this.userRepository.findOne({
      where: { id: dto.userId },
    });

    return {
      exists: Boolean(user),
    };
  }

  @RabbitRPC({
    exchange: RefreshTokensContract.exchange,
    routingKey: RefreshTokensContract.routingKey,
    queue: RefreshTokensContract.queue,
    errorBehavior: MessageHandlerErrorBehavior.NACK,
    errorHandler: defaultNackErrorHandler,
    allowNonJsonMessages: true,
    name: 'refresh-tokens',
  })
  async refreshTokens(
    dto: RefreshTokensContract.Dto
  ): Promise<RefreshTokensContract.Response> {
    const user = await this.userRepository.findOne({
      where: { id: dto.userId },
    });

    if (!user) {
      throw new BadRequestException('Invalid refresh token');
    }

    const { accessToken, refreshToken } = await this.generateTokens({
      id: user.id,
      email: user.email,
      userType: user.userType,
    });

    await this.updateUser(user.id, {
      refreshToken,
    });

    return {
      accessToken,
      refreshToken,
    };
  }

  @RabbitRPC({
    exchange: LoginContract.exchange,
    routingKey: LoginContract.routingKey,
    queue: LoginContract.queue,
    errorBehavior: MessageHandlerErrorBehavior.NACK,
    errorHandler: defaultNackErrorHandler,
    allowNonJsonMessages: true,
    name: 'login',
  })
  async login(dto: LoginContract.Request): Promise<LoginContract.Response> {
    const user = await this.userRepository.findOne({
      where: { email: dto.email },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isMatch = await bcrypt.compare(dto.password, user.password);

    if (!isMatch) {
      throw new BadRequestException('Invalid credentials');
    }

    const { accessToken, refreshToken } = await this.generateTokens({
      id: user.id,
      email: user.email,
      userType: user.userType,
    });

    await this.updateUser(user.id, {
      refreshToken,
    });

    return {
      accessToken,
      refreshToken,
    };
  }

  @RabbitRPC({
    exchange: LogoutContract.exchange,
    routingKey: LogoutContract.routingKey,
    queue: LogoutContract.queue,
    errorBehavior: MessageHandlerErrorBehavior.NACK,
    errorHandler: defaultNackErrorHandler,
    allowNonJsonMessages: true,
    name: 'logout',
  })
  async logout(dto: LogoutContract.Dto): Promise<LogoutContract.Response> {
    const user = await this.userRepository.findOne({
      where: { id: dto.userId },
    });

    if (!user) {
      throw new BadRequestException('Invalid refresh token');
    }

    await this.updateUser(user.id, {
      refreshToken: null,
    });

    return {
      userId: user.id,
    };
  }

  @RabbitRPC({
    exchange: GetProfileContract.exchange,
    routingKey: GetProfileContract.routingKey,
    queue: GetProfileContract.queue,
    errorBehavior: MessageHandlerErrorBehavior.NACK,
    errorHandler: defaultNackErrorHandler,
    allowNonJsonMessages: true,
    name: 'get-profile',
  })
  async getProfile(
    dto: GetProfileContract.Dto
  ): Promise<GetProfileContract.Response> {
    const user = await this.userRepository.findOne({
      where: { id: dto.userId },
      relations: ['client', 'pm', 'developer'],
    });

    if (!user) {
      throw new NotFoundException('Invalid refresh token');
    }

    return {
      id: user.id,
      email: user.email,
      userType: user.userType,
      description: user.description,
      telegramId: user.telegramId,
      name: user.name,
      client: user.client,
      pm: user.pm,
      developer: user.developer,
    };
  }

  async createUser(userParams: DeepPartial<UserEntity>) {
    const { password, ...rest } = userParams;

    const user = this.userRepository.create({
      ...rest,
      password: await this.hashPassword(password),
    });

    await this.userRepository.save(user);

    return user;
  }

  async updateUser(userId: number, userParams: DeepPartial<UserEntity>) {
    const user = await this.userRepository.update({ id: userId }, userParams);

    return user;
  }

  async signPayload(payload: Buffer | object, options?: JwtSignOptions) {
    return this.jwtService.signAsync(payload, options);
  }

  async generateTokens(payload: {
    id: number;
    email: string;
    userType: UserType;
  }) {
    const accessToken = await this.signPayload(payload, {
      expiresIn: '30m',
      secret: this.configService.getOrThrow<string>('AT_SECRET'),
    });

    const refreshToken = await this.signPayload(payload, {
      expiresIn: '7d',
      secret: this.configService.getOrThrow<string>('RT_SECRET'),
    });

    return {
      accessToken,
      refreshToken,
    };
  }

  async hashPassword(password: string) {
    return bcrypt.hash(password, 10);
  }
}
