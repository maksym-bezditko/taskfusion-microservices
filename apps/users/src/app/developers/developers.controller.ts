import { Controller } from '@nestjs/common';
import { DevelopersService } from './developers.service';

@Controller('developers')
export class DevelopersController {
  constructor(private readonly developersService: DevelopersService) {}
}
