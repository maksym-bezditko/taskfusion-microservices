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
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { handleRpcRequest } from '@taskfusion-microservices/helpers';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly amqpConnection: AmqpConnection
  ) {}

  @Post('create-client')
  async createClient(
    @Body() dto: CreateClientContract.Request
  ): Promise<CreateClientContract.Response> {
    const result =
      await this.amqpConnection.request<CreateClientContract.Response>({
        exchange: CreateClientContract.exchange,
        routingKey: CreateClientContract.routingKey,
        payload: dto as CreateClientContract.Dto,
      });

    return handleRpcRequest(result, async (response) => response);
  }

  @Post('create-developer')
  async createDeveloper(
    @Body() dto: CreateDeveloperContract.Request
  ): Promise<CreateDeveloperContract.Response> {
    const result =
      await this.amqpConnection.request<CreateDeveloperContract.Response>({
        exchange: CreateDeveloperContract.exchange,
        routingKey: CreateDeveloperContract.routingKey,
        payload: dto as CreateDeveloperContract.Dto,
      });

    return handleRpcRequest(result, async (response) => response);
  }

  @Post('create-pm')
  async createPm(
    @Body() dto: CreatePmContract.Request
  ): Promise<CreatePmContract.Response> {
    const result = await this.amqpConnection.request<CreatePmContract.Response>(
      {
        exchange: CreatePmContract.exchange,
        routingKey: CreatePmContract.routingKey,
        payload: dto as CreatePmContract.Dto,
      }
    );

    return handleRpcRequest(result, async (response) => response);
  }

  @UseGuards(RtJwtGuard)
  @Post('refresh-tokens')
  async refreshTokens(
    @UserIdFromJwt() userId: number,
    @JwtTokenFromBearer() refreshToken: string
  ): Promise<RefreshTokensContract.Response> {
    const result =
      await this.amqpConnection.request<RefreshTokensContract.Response>({
        exchange: RefreshTokensContract.exchange,
        routingKey: RefreshTokensContract.routingKey,
        payload: {
          userId,
          refreshToken,
        } as RefreshTokensContract.Dto,
      });

    return handleRpcRequest(result, async (response) => response);
  }

  @UseGuards(AtJwtGuard)
  @Post('logout')
  async logout(
    @UserIdFromJwt() userId: number
  ): Promise<LogoutContract.Response> {
    const result = await this.amqpConnection.request<LogoutContract.Response>({
      exchange: LogoutContract.exchange,
      routingKey: LogoutContract.routingKey,
      payload: {
        userId,
      } as LogoutContract.Dto,
    });

    return handleRpcRequest(result, async (response) => response);
  }

  @Post('login')
  async login(
    @Body() dto: LoginContract.Request
  ): Promise<LoginContract.Response> {
    const result = await this.amqpConnection.request<LoginContract.Response>({
      exchange: LoginContract.exchange,
      routingKey: LoginContract.routingKey,
      payload: dto as LoginContract.Dto,
    });

    return handleRpcRequest(result, async (response) => response);
  }
}
