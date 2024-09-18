import { Injectable } from '@nestjs/common';
import { BaseService } from '@taskfusion-microservices/common';

@Injectable()
export class PaymentsService extends BaseService {
  constructor() {
    super(PaymentsService.name);
  }
}
