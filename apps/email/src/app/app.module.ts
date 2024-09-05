import { Module } from '@nestjs/common';

import { ConfigModule, ConfigService } from '@nestjs/config';
import { RmqDynamicModule } from '@taskfusion-microservices/modules';
import { MailerModule } from '@nestjs-modules/mailer';
import { EmailModule } from './email/email.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
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
    EmailModule,
  ],
})
export class AppModule {}
