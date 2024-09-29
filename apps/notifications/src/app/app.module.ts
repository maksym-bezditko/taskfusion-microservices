import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RmqDynamicModule } from '@taskfusion-microservices/modules';
import { InAppNotificationsModule } from './in-app-notifications/in-app-notifications.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { getTypeOrmConfig } from '@taskfusion-microservices/helpers';
import { NotificationEntity } from '@taskfusion-microservices/entities';
import { MailerModule } from '@nestjs-modules/mailer';
import { EmailsModule } from './emails/emails.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) =>
        getTypeOrmConfig(configService, [NotificationEntity]),
    }),
    RmqDynamicModule.register(),
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        transport: {
          host: configService.getOrThrow<string>('EMAIL_HOST'),
          auth: {
            user: configService.getOrThrow<string>('EMAIL_USERNAME'),
            pass: configService.getOrThrow<string>('EMAIL_PASSWORD'),
          },
        },
      }),
    }),
    InAppNotificationsModule,
    EmailsModule,
  ],
})
export class AppModule {}
