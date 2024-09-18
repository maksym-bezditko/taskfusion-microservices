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
  GetUserByEmailContract,
  GetUserByIdContract,
  GetUsersByIdsContract,
  LoginContract,
  LogoutContract,
  RefreshTokensContract,
} from '@taskfusion-microservices/contracts';
import { RabbitRPC } from '@golevelup/nestjs-rabbitmq';
import { BaseService } from '@taskfusion-microservices/common';

@Injectable()
export class UsersService extends BaseService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService
  ) {
    super(UsersService.name);
  }

  @RabbitRPC({
    exchange: GetUserByIdContract.exchange,
    routingKey: GetUserByIdContract.routingKey,
    queue: GetUserByIdContract.queue,
  })
  async getUserById(
    dto: GetUserByIdContract.Dto
  ): Promise<GetUserByIdContract.Response> {
    const { id } = dto;

    const user = await this.userRepository.findOne({
      where: { id },
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

    this.logger.log('Retrieving user by id');

    return user;
  }

  @RabbitRPC({
    exchange: GetUserByEmailContract.exchange,
    routingKey: GetUserByEmailContract.routingKey,
    queue: GetUserByEmailContract.queue,
  })
  async getUserByEmail(
    dto: GetUserByEmailContract.Dto
  ): Promise<GetUserByEmailContract.Response> {
    const { email } = dto;

    const user = await this.userRepository.findOne({
      where: { email },
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

    this.logger.log('Retrieving user by email');

    return user;
  }

  @RabbitRPC({
    exchange: GetUsersByIdsContract.exchange,
    routingKey: GetUsersByIdsContract.routingKey,
    queue: GetUsersByIdsContract.queue,
  })
  async getUsersByIds(
    dto: GetUsersByIdsContract.Dto
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

    this.logger.log('Retrieving users by ids');

    return users;
  }

  @RabbitRPC({
    exchange: CheckUserContract.exchange,
    routingKey: CheckUserContract.routingKey,
    queue: CheckUserContract.queue,
  })
  async checkUser(
    dto: CheckUserContract.Dto
  ): Promise<CheckUserContract.Response> {
    const user = await this.userRepository.findOne({
      where: { id: dto.userId },
    });

    this.logger.log('Checking if user exists');

    return {
      exists: Boolean(user),
    };
  }

  @RabbitRPC({
    exchange: RefreshTokensContract.exchange,
    routingKey: RefreshTokensContract.routingKey,
    queue: RefreshTokensContract.queue,
  })
  async refreshTokens(
    dto: RefreshTokensContract.Dto
  ): Promise<RefreshTokensContract.Response> {
    const user = await this.userRepository.findOne({
      where: { id: dto.userId },
    });

    if (!user) {
      this.logAndThrowError(new BadRequestException('Invalid refresh token'));
    }

    const { accessToken, refreshToken } = await this.generateTokens({
      id: user.id,
      email: user.email,
      userType: user.userType,
    });

    await this.updateUser(user.id, {
      refreshToken,
    });

    this.logger.log('Refreshing tokens');

    return {
      accessToken,
      refreshToken,
    };
  }

  @RabbitRPC({
    exchange: LoginContract.exchange,
    routingKey: LoginContract.routingKey,
    queue: LoginContract.queue,
  })
  async login(dto: LoginContract.Dto): Promise<LoginContract.Response> {
    const user = await this.userRepository.findOne({
      where: { email: dto.email },
    });

    if (!user) {
      this.logAndThrowError(new NotFoundException('User not found'));
    }

    const isMatch = await bcrypt.compare(dto.password, user.password);

    if (!isMatch) {
      this.logAndThrowError(new BadRequestException('Invalid credentials'));
    }

    const { accessToken, refreshToken } = await this.generateTokens({
      id: user.id,
      email: user.email,
      userType: user.userType,
    });

    await this.updateUser(user.id, {
      refreshToken,
    });

    this.logger.log('User logged in');

    return {
      accessToken,
      refreshToken,
    };
  }

  @RabbitRPC({
    exchange: LogoutContract.exchange,
    routingKey: LogoutContract.routingKey,
    queue: LogoutContract.queue,
  })
  async logout(dto: LogoutContract.Dto): Promise<LogoutContract.Response> {
    const user = await this.userRepository.findOne({
      where: { id: dto.userId },
    });

    if (!user) {
      this.logAndThrowError(new BadRequestException('Invalid refresh token'));
    }

    await this.updateUser(user.id, {
      refreshToken: null,
    });

    this.logger.log('User logged out');

    return {
      userId: user.id,
    };
  }

  @RabbitRPC({
    exchange: GetProfileContract.exchange,
    routingKey: GetProfileContract.routingKey,
    queue: GetProfileContract.queue,
  })
  async getProfile(
    dto: GetProfileContract.Dto
  ): Promise<GetProfileContract.Response> {
    const user = await this.userRepository.findOne({
      where: { id: dto.userId },
      relations: ['client', 'pm', 'developer'],
    });

    if (!user) {
      this.logAndThrowError(new NotFoundException('Invalid refresh token'));
    }

    this.logger.log('Retrieving user profile');

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

    this.logger.log(`User ${userId} updated`);

    return user;
  }

  async signPayload(payload: Buffer | object, options?: JwtSignOptions) {
    this.logger.log('Signing payload with JWT');

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

    this.logger.log('New tokens generated');

    return {
      accessToken,
      refreshToken,
    };
  }

  async hashPassword(password: string) {
    return bcrypt.hash(password, 10);
  }
}
