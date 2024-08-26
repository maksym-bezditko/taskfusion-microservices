import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { AtJwtGuard, UserIdFromJwt } from '@taskfusion-microservices/common';
import {
  CheckPmEmailContract,
  GetProfileContract,
} from '@taskfusion-microservices/contracts';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(AtJwtGuard)
  @Get('profile')
  async getProfile(
    @UserIdFromJwt() userId: number
  ): Promise<GetProfileContract.Response> {
    return this.usersService.getProfile(
      GetProfileContract.exchange,
      GetProfileContract.routingKey,
      {
        userId,
      }
    );
  }

  @UseGuards(AtJwtGuard)
  @Post('check-pm-email')
  async checkPmEmail(
    @Body() dto: CheckPmEmailContract.Request
  ): Promise<CheckPmEmailContract.Response> {
    return this.usersService.checkPmEmail(
      CheckPmEmailContract.exchange,
      CheckPmEmailContract.routingKey,
      dto
    );
  }
}
