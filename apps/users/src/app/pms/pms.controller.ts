import { Controller } from '@nestjs/common';
import { PmsService } from './pms.service';

@Controller('pms')
export class PmsController {
  constructor(private readonly pmsService: PmsService) {}
}
