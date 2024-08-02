import { Controller, Get, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { AtJwtGuard, UserIdFromJwt } from '@taskfusion-microservices/common';
import { GetProfileContract } from '@taskfusion-microservices/contracts';

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
}
