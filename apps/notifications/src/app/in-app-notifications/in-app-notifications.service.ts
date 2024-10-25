import { RabbitRPC } from '@golevelup/nestjs-rabbitmq';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { BaseService } from '@taskfusion-microservices/common';
import {
  CreateNotificationContract,
  GetUserNotificationsContract,
  ReadMyNotificationsContract,
} from '@taskfusion-microservices/contracts';
import { NotificationEntity } from '@taskfusion-microservices/entities';
import { Repository } from 'typeorm';

@Injectable()
export class InAppNotificationsService extends BaseService {
  constructor(
    @InjectRepository(NotificationEntity)
    private readonly notificationsRepository: Repository<NotificationEntity>
  ) {
    super(InAppNotificationsService.name);
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

  @RabbitRPC({
    exchange: GetUserNotificationsContract.exchange,
    routingKey: GetUserNotificationsContract.routingKey,
    queue: GetUserNotificationsContract.queue,
  })
  async getUserNotificationsRpcHandler(dto: GetUserNotificationsContract.Dto) {
    this.logger.log(`Retrieving notifications for user ${dto.userId}`);

    return this.getUserNotifications(dto);
  }

  private async getUserNotifications(dto: GetUserNotificationsContract.Dto) {
    const entries = await this.getNotificationsByUserId(dto.userId);

    return entries;
  }

  private async getNotificationsByUserId(userId: number) {
    const entries = await this.notificationsRepository.find({
      where: {
        userId,
      },
    });

    return entries;
  }

  @RabbitRPC({
    exchange: ReadMyNotificationsContract.exchange,
    routingKey: ReadMyNotificationsContract.routingKey,
    queue: ReadMyNotificationsContract.queue,
  })
  async readMyNotificationsContract(dto: ReadMyNotificationsContract.Dto) {
    this.logger.log(`Reading notifications for user ${dto.userId}`);

    return this.readUserNotifications(dto);
  }

  private async readUserNotifications(dto: ReadMyNotificationsContract.Dto) {
    const result = await this.notificationsRepository.update(
      {
        userId: dto.userId,
      },
      {
        isRead: true,
      }
    );

    return {
      success: result.affected > 0,
    };
  }
}
