import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateClientContract } from '@taskfusion-microservices/contracts';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('create-client')
  createUser(
    @Body() dto: CreateClientContract.Request
  ): Promise<CreateClientContract.Response> {
    return this.authService.createUser<
      CreateClientContract.Request,
      CreateClientContract.Response
    >(CreateClientContract.topic, dto);
  }
}
