import { RabbitRPC } from '@golevelup/nestjs-rabbitmq';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { BaseService } from '@taskfusion-microservices/common';
import { CreateNotificationContract } from '@taskfusion-microservices/contracts';
import { NotificationEntity } from '@taskfusion-microservices/entities';
import { Repository } from 'typeorm';

@Injectable()
export class NotificationsService extends BaseService {
  constructor(
    @InjectRepository(NotificationEntity)
    private readonly notificationsRepository: Repository<NotificationEntity>
  ) {
    super(NotificationsService.name);
  }

  @RabbitRPC({
    exchange: CreateNotificationContract.exchange,
    routingKey: CreateNotificationContract.routingKey,
    queue: CreateNotificationContract.queue,
  })
  async createNotificationRpcHandler(dto: CreateNotificationContract.Dto) {
    this.logger.log(`Creating a notification for user ${dto.userId}`);

		return this.createNotification(dto);
  }

  private async createNotification(dto: CreateNotificationContract.Dto) {
    const entity = this.notificationsRepository.create({
      title: dto.title,
      redirectUrl: dto.redirectUrl,
      userId: dto.userId,
    });

    await this.notificationsRepository.save(entity);

    return entity;
  }
}
