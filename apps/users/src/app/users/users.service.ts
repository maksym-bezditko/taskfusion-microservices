import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { UserEntity } from '@taskfusion-microservices/entities';
import { DeepPartial, Repository } from 'typeorm';
import bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import {
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
      where: { id: dto.userId, refresh_token: dto.refreshToken },
    });

    if (!user) {
      throw new BadRequestException('Invalid refresh token');
    }

    const { accessToken, refreshToken } = await this.generateTokens({
      id: user.id,
      email: user.email,
      user_type: user.user_type,
    });

    await this.updateRefreshToken(user.id, refreshToken);

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
      throw new UnauthorizedException('Invalid credentials');
    }

    const { accessToken, refreshToken } = await this.generateTokens({
      id: user.id,
      email: user.email,
      user_type: user.user_type,
    });

    await this.updateRefreshToken(user.id, refreshToken);

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

    await this.updateRefreshToken(user.id, null);

    return {
      userId: user.id,
    };
  }

  async createUser(userParams: DeepPartial<UserEntity>) {
    const { email, password, telegram_id, user_type, description } = userParams;

    const user = this.userRepository.create({
      email,
      password: await this.hashPassword(password),
      description,
      telegram_id,
      user_type,
    });

    await this.userRepository.save(user);

    return user;
  }

  async updateRefreshToken(
    userId: number,
    refreshToken: UserEntity['refresh_token']
  ) {
    const user = await this.userRepository.update(
      { id: userId },
      { refresh_token: refreshToken }
    );

    return user;
  }

  async signPayload(payload: Buffer | object, options?: JwtSignOptions) {
    return this.jwtService.signAsync(payload, options);
  }

  async generateTokens(payload: {
    id: number;
    email: string;
    user_type: string;
  }) {
    const accessToken = await this.signPayload(payload, {
      expiresIn: '1h',
      secret: this.configService.get<string>('AT_SECRET'),
    });

    const refreshToken = await this.signPayload(payload, {
      expiresIn: '7d',
      secret: this.configService.get<string>('RT_SECRET'),
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
