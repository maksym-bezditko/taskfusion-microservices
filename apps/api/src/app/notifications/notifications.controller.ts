import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import {
  AtJwtGuard,
  CustomAmqpConnection,
  UserIdFromJwt,
} from '@taskfusion-microservices/common';
import {
  GetUserNotificationsContract,
  ReadMyNotificationsContract,
} from '@taskfusion-microservices/contracts';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly customAmqpConnection: CustomAmqpConnection) {}

  @UseGuards(AtJwtGuard)
  @Get()
  async getUserNotifications(
    @UserIdFromJwt() userId: number
  ): Promise<GetUserNotificationsContract.Response> {
    const payload: GetUserNotificationsContract.Dto = {
      userId,
    };

    return this.customAmqpConnection.requestOrThrow<GetUserNotificationsContract.Response>(
      GetUserNotificationsContract.routingKey,
      payload
    );
  }

  @UseGuards(AtJwtGuard)
  @Post('read-my-notifications')
  async readMyNotifications(
    @UserIdFromJwt() userId: number
  ): Promise<ReadMyNotificationsContract.Response> {
    const payload: ReadMyNotificationsContract.Dto = {
      userId,
    };

    return this.customAmqpConnection.requestOrThrow<ReadMyNotificationsContract.Response>(
      ReadMyNotificationsContract.routingKey,
      payload
    );
  }
}
