import { Injectable } from '@nestjs/common';

@Injectable()
export class PaymentsService {
  getData(): { message: string } {
    return { message: 'Hello API' };
  }
}
