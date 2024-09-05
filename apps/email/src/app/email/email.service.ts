import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { MailerService } from '@nestjs-modules/mailer';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SendEmailContract } from '@taskfusion-microservices/contracts';

@Injectable()
export class EmailService {
	constructor(private readonly mailService: MailerService, private readonly configService: ConfigService) {}

  @RabbitSubscribe({
    exchange: SendEmailContract.exchange,
    routingKey: SendEmailContract.routingKey,
    queue: SendEmailContract.queue,
    allowNonJsonMessages: true,
    name: 'send-email',
  })
  async sendEmail(dto: SendEmailContract.Dto) {
    const { message, recipientEmail, subject } = dto;

    await this.mailService.sendMail({
      to: recipientEmail,
      subject: subject,
      html: message,
      from: {
        name: 'TaskFusion',
        address: this.configService.getOrThrow<string>('EMAIL_USERNAME'),
      },
    });
  }
}
