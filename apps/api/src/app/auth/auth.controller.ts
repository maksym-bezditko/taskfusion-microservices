import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import {
  CreateClientContract,
  CreateDeveloperContract,
  CreatePmContract,
  LoginContract,
  LogoutContract,
  RefreshTokensContract,
} from '@taskfusion-microservices/contracts';
import {
  AtJwtGuard,
  JwtTokenFromBearer,
  RtJwtGuard,
  UserIdFromJwt,
} from '@taskfusion-microservices/common';
import { CustomAmqpConnection } from '@taskfusion-microservices/common';

@Controller('auth')
export class AuthController {
  constructor(private readonly customAmqpConnection: CustomAmqpConnection) {}

  @Post('create-client')
  async createClient(
    @Body() dto: CreateClientContract.Request
  ): Promise<CreateClientContract.Response> {
    return this.customAmqpConnection.requestOrThrow<CreateClientContract.Response>(
      CreateClientContract.routingKey,
      dto
    );
  }

  @Post('create-developer')
  async createDeveloper(
    @Body() dto: CreateDeveloperContract.Request
  ): Promise<CreateDeveloperContract.Response> {
    return this.customAmqpConnection.requestOrThrow<CreateDeveloperContract.Response>(
      CreateDeveloperContract.routingKey,
      dto
    );
  }

  @Post('create-pm')
  async createPm(
    @Body() dto: CreatePmContract.Request
  ): Promise<CreatePmContract.Response> {
    return this.customAmqpConnection.requestOrThrow<CreatePmContract.Response>(
      CreatePmContract.routingKey,
      dto
    );
  }

  @UseGuards(RtJwtGuard)
  @Post('refresh-tokens')
  async refreshTokens(
    @UserIdFromJwt() userId: number,
    @JwtTokenFromBearer() refreshToken: string
  ): Promise<RefreshTokensContract.Response> {
    const payload: RefreshTokensContract.Dto = {
      refreshToken,
      userId,
    };

    return this.customAmqpConnection.requestOrThrow<RefreshTokensContract.Response>(
      RefreshTokensContract.routingKey,
      payload
    );
  }

  @UseGuards(AtJwtGuard)
  @Post('logout')
  async logout(
    @UserIdFromJwt() userId: number
  ): Promise<LogoutContract.Response> {
    const payload: LogoutContract.Dto = {
      userId,
    };

    return this.customAmqpConnection.requestOrThrow<LogoutContract.Response>(
      LogoutContract.routingKey,
      payload
    );
  }

  @Post('login')
  async login(
    @Body() dto: LoginContract.Request
  ): Promise<LoginContract.Response> {
    return this.customAmqpConnection.requestOrThrow<LoginContract.Response>(
      LoginContract.routingKey,
      dto
    );
  }
}
