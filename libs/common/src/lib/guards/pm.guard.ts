import { Injectable } from '@nestjs/common';
import { UserType } from '@taskfusion-microservices/entities';
import { UserTypeGuard } from './user-type.guard';

@Injectable()
export class PmGuard extends UserTypeGuard {
  constructor() {
    super(UserType.PM);
  }
}
