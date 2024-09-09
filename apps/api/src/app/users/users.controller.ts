import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AtJwtGuard, UserIdFromJwt } from '@taskfusion-microservices/common';
import {
  CheckDeveloperEmailContract,
  CheckPmEmailContract,
  GetProfileContract,
} from '@taskfusion-microservices/contracts';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { handleRpcRequest } from '@taskfusion-microservices/helpers';

@Controller('users')
export class UsersController {
  constructor(
    private readonly amqpConnection: AmqpConnection
  ) {}

  @UseGuards(AtJwtGuard)
  @Get('profile')
  async getProfile(
    @UserIdFromJwt() userId: number
  ): Promise<GetProfileContract.Response> {
    const result =
      await this.amqpConnection.request<GetProfileContract.Response>({
        exchange: GetProfileContract.exchange,
        routingKey: GetProfileContract.routingKey,
        payload: {
          userId,
        },
      });

    return handleRpcRequest(result, async (response) => response);
  }

  @UseGuards(AtJwtGuard)
  @Post('check-pm-email')
  async checkPmEmail(
    @Body() dto: CheckPmEmailContract.Request
  ): Promise<CheckPmEmailContract.Response> {
    const result =
      await this.amqpConnection.request<CheckPmEmailContract.Response>({
        exchange: CheckPmEmailContract.exchange,
        routingKey: CheckPmEmailContract.routingKey,
        payload: dto,
      });

    return handleRpcRequest(result, async (response) => response);
  }

  @UseGuards(AtJwtGuard)
  @Post('check-developer-email')
  async checkDeveloperEmail(
    @Body() dto: CheckDeveloperEmailContract.Request
  ): Promise<CheckDeveloperEmailContract.Response> {
    const result =
      await this.amqpConnection.request<CheckDeveloperEmailContract.Response>({
        exchange: CheckDeveloperEmailContract.exchange,
        routingKey: CheckDeveloperEmailContract.routingKey,
        payload: dto,
      });

    return handleRpcRequest(result, async (response) => response);
  }
}
