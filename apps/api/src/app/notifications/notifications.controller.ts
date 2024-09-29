import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  AtJwtGuard,
  CustomAmqpConnection,
  UserIdFromJwt,
} from '@taskfusion-microservices/common';
import {
  GetUserNotificationsContract,
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
}
