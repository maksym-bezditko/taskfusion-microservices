import { Module } from '@nestjs/common';
import { InAppNotificationsService } from './in-app-notifications.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationEntity } from '@taskfusion-microservices/entities';

@Module({
  imports: [TypeOrmModule.forFeature([NotificationEntity])],
  providers: [InAppNotificationsService],
})
export class InAppNotificationsModule {}
