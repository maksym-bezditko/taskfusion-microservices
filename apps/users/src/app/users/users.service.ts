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
import { defaultNackErrorHandler, RabbitRPC } from '@golevelup/nestjs-rabbitmq';
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
    errorHandler: defaultNackErrorHandler,
  })
  async getUserByIdRpcHandler(
    dto: GetUserByIdContract.Dto
  ): Promise<GetUserByIdContract.Response> {
    this.logger.log('Retrieving user by id');

    return this.getUserById(dto.id);
  }

  private async getUserById(userId: number) {
    return this.userRepository.findOne({
      where: { id: userId },
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
  }

  @RabbitRPC({
    exchange: GetUserByEmailContract.exchange,
    routingKey: GetUserByEmailContract.routingKey,
    queue: GetUserByEmailContract.queue,
    errorHandler: defaultNackErrorHandler,
  })
  async getUserByEmailRpcHandler(
    dto: GetUserByEmailContract.Dto
  ): Promise<GetUserByEmailContract.Response> {
    this.logger.log('Retrieving user by email');

    return this.getUserByEmail(dto.email);
  }

  private async getUserByEmail(email: string) {
    return this.userRepository.findOne({
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
  }

  @RabbitRPC({
    exchange: GetUsersByIdsContract.exchange,
    routingKey: GetUsersByIdsContract.routingKey,
    queue: GetUsersByIdsContract.queue,
    errorHandler: defaultNackErrorHandler,
  })
  async getUsersByIdsRpcHandler(
    dto: GetUsersByIdsContract.Dto
  ): Promise<GetUsersByIdsContract.Response> {
    this.logger.log('Retrieving users by ids');

    return this.getUsersByIds(dto.ids);
  }

  private async getUsersByIds(ids: number[]) {
    return this.userRepository.find({
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
  }

  @RabbitRPC({
    exchange: CheckUserContract.exchange,
    routingKey: CheckUserContract.routingKey,
    queue: CheckUserContract.queue,
    errorHandler: defaultNackErrorHandler,
  })
  async checkUserRpcHandler(
    dto: CheckUserContract.Dto
  ): Promise<CheckUserContract.Response> {
    this.logger.log('Checking if user exists');

    return this.checkUser(dto.userId);
  }

  private async checkUser(userId: number) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    return {
      exists: Boolean(user),
    };
  }

  @RabbitRPC({
    exchange: RefreshTokensContract.exchange,
    routingKey: RefreshTokensContract.routingKey,
    queue: RefreshTokensContract.queue,
    errorHandler: defaultNackErrorHandler,
  })
  async refreshTokensRpcHandler(
    dto: RefreshTokensContract.Dto
  ): Promise<RefreshTokensContract.Response> {
    this.logger.log('Refreshing tokens');

    return this.refreshTokens(dto.userId);
  }

  private async refreshTokens(userId: number) {
    const user = await this.getUserByIdOrThrow(userId);

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

  private async getUserByIdOrThrow(id: number) {
    const user = await this.getUserById(id);

    if (!user) {
      this.logAndThrowError(new BadRequestException('Invalid refresh token'));
    }

    return user;
  }

  @RabbitRPC({
    exchange: LoginContract.exchange,
    routingKey: LoginContract.routingKey,
    queue: LoginContract.queue,
    errorHandler: defaultNackErrorHandler,
  })
  async loginRpcHandler(
    dto: LoginContract.Dto
  ): Promise<LoginContract.Response> {
    this.logger.log('User logging in');

    return this.login(dto.email, dto.password);
  }

  private async login(email: string, password: string) {
    const user = await this.getUserByEmailOrThrow(email);

    await this.throwIfPasswordsDontMatch(password, user.password);

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

  async getUserByEmailOrThrow(email: string) {
    const user = await this.getUserByEmail(email);

    if (!user) {
      this.logAndThrowError(new BadRequestException('Invalid credentials'));
    }

    return user;
  }

  private async throwIfPasswordsDontMatch(
    password: string,
    hashedPassword: string
  ) {
    const isMatch = await bcrypt.compare(password, hashedPassword);

    if (!isMatch) {
      this.logAndThrowError(new BadRequestException('Invalid credentials'));
    }
  }

  @RabbitRPC({
    exchange: LogoutContract.exchange,
    routingKey: LogoutContract.routingKey,
    queue: LogoutContract.queue,
    errorHandler: defaultNackErrorHandler,
  })
  async logoutRpcHandler(
    dto: LogoutContract.Dto
  ): Promise<LogoutContract.Response> {
    this.logger.log('User logged out');

    return this.logout(dto.userId);
  }

  private async logout(userId: number) {
    const user = await this.getUserByIdOrThrow(userId);

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
    errorHandler: defaultNackErrorHandler,
  })
  async getProfileRpcHandler(
    dto: GetProfileContract.Dto
  ): Promise<GetProfileContract.Response> {
    this.logger.log('Retrieving user profile');

    return this.getProfile(dto.userId);
  }

  private async getProfile(userId: number) {
    return this.getUserByIdWithUserTypeRelationsOrThrow(userId);
  }

  private async getUserByIdWithUserTypeRelationsOrThrow(id: number) {
    const user = await this.getUserByIdWithUserTypeRelations(id);

    if (!user) {
      this.logAndThrowError(new NotFoundException('User not found'));
    }

    return user;
  }

  private async getUserByIdWithUserTypeRelations(id: number) {
    return this.userRepository.findOne({
      where: { id },
      relations: ['client', 'pm', 'developer'],
    });
  }

  async createUser(userParams: DeepPartial<UserEntity>) {
    const { password, ...rest } = userParams;

    const passwordHash = await this.hashPassword(password);

    const user = this.userRepository.create({
      ...rest,
      password: passwordHash,
    });

    await this.userRepository.save(user);

    return user;
  }

  async updateUser(userId: number, userParams: DeepPartial<UserEntity>) {
    const user = await this.userRepository.update({ id: userId }, userParams);

    this.logger.log(`User ${userId} updated`);

    return user;
  }

  private async signPayload(
    payload: Buffer | object,
    options?: JwtSignOptions
  ) {
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

  private async hashPassword(password: string) {
    return bcrypt.hash(password, 10);
  }

  async throwIfUserTypeDoesNotMatch(
    user: UserEntity,
    expectedUserType: UserType
  ) {
    if (!user || user.userType !== expectedUserType) {
      this.logAndThrowError(
        new BadRequestException(`${expectedUserType} user not found`)
      );
    }
  }
}
