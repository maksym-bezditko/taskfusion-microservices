import { Body, Controller, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
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

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('create-client')
  async createClient(
    @Body() dto: CreateClientContract.Request
  ): Promise<CreateClientContract.Response> {
    return this.authService.createUser<
      CreateClientContract.Request,
      CreateClientContract.Response
    >(CreateClientContract.exchange, CreateClientContract.routingKey, dto);
  }

  @Post('create-developer')
  async createDeveloper(
    @Body() dto: CreateDeveloperContract.Request
  ): Promise<CreateDeveloperContract.Response> {
    return this.authService.createUser<
      CreateDeveloperContract.Request,
      CreateDeveloperContract.Response
    >(
      CreateDeveloperContract.exchange,
      CreateDeveloperContract.routingKey,
      dto
    );
  }

  @Post('create-pm')
  async createPm(
    @Body() dto: CreatePmContract.Request
  ): Promise<CreatePmContract.Response> {
    return this.authService.createUser<
      CreatePmContract.Request,
      CreatePmContract.Response
    >(CreatePmContract.exchange, CreatePmContract.routingKey, dto);
  }

  @UseGuards(RtJwtGuard)
  @Patch('refresh-tokens')
  async refreshTokens(
    @UserIdFromJwt() userId: number,
    @JwtTokenFromBearer() refreshToken: string
  ): Promise<RefreshTokensContract.Response> {
    return this.authService.refreshTokens(
      RefreshTokensContract.exchange,
      RefreshTokensContract.routingKey,
      {
        userId,
        refreshToken,
      }
    );
  }

  @UseGuards(AtJwtGuard)
  @Post('logout')
  async logout(
    @UserIdFromJwt() userId: number,
  ): Promise<LogoutContract.Response> {
    return this.authService.logout(
      LogoutContract.exchange,
      LogoutContract.routingKey,
      {
        userId,
      }
    );
  }

  @Post('login')
  async login(@Body() dto: LoginContract.Request): Promise<LoginContract.Response> {
    return this.authService.login(
      LoginContract.exchange,
      LoginContract.routingKey,
      dto
    );
  }
}
