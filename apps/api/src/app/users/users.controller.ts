import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import {
  AtJwtGuard,
  CustomAmqpConnection,
  UserIdFromJwt,
} from '@taskfusion-microservices/common';
import {
  CheckDeveloperEmailContract,
  CheckPmEmailContract,
  GetProfileContract,
} from '@taskfusion-microservices/contracts';

@Controller('users')
export class UsersController {
  constructor(private readonly customAmqpConnection: CustomAmqpConnection) {}

  @UseGuards(AtJwtGuard)
  @Get('profile')
  async getProfile(
    @UserIdFromJwt() userId: number
  ): Promise<GetProfileContract.Response> {
    const payload: GetProfileContract.Dto = {
      userId,
    };

    return this.customAmqpConnection.requestOrThrow<GetProfileContract.Response>(
      GetProfileContract.routingKey,
      payload
    );
  }

  @UseGuards(AtJwtGuard)
  @Post('check-pm-email')
  async checkPmEmail(
    @Body() dto: CheckPmEmailContract.Request
  ): Promise<CheckPmEmailContract.Response> {
    return this.customAmqpConnection.requestOrThrow<CheckPmEmailContract.Response>(
      CheckPmEmailContract.routingKey,
      dto
    );
  }

  @UseGuards(AtJwtGuard)
  @Post('check-developer-email')
  async checkDeveloperEmail(
    @Body() dto: CheckDeveloperEmailContract.Request
  ): Promise<CheckDeveloperEmailContract.Response> {
    return this.customAmqpConnection.requestOrThrow<CheckDeveloperEmailContract.Response>(
      CheckDeveloperEmailContract.routingKey,
      dto
    );
  }
}
