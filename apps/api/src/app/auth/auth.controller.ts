import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import {
  CreateClientContract,
  CreateDeveloperContract,
  CreatePmContract,
} from '@taskfusion-microservices/contracts';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('create-client')
  async createClient(
    @Body() dto: CreateClientContract.Request
  ): Promise<CreateClientContract.Response> {
    return this.authService.createUser<
      CreateClientContract.Request,
      CreateClientContract.Response
    >(CreateClientContract.exchange, CreateClientContract.routingKey, dto);
  }

  @Post('create-developer')
  async createDeveloper(
    @Body() dto: CreateDeveloperContract.Request
  ): Promise<CreateDeveloperContract.Response> {
    return this.authService.createUser<
      CreateDeveloperContract.Request,
      CreateDeveloperContract.Response
    >(
      CreateDeveloperContract.exchange,
      CreateDeveloperContract.routingKey,
      dto
    );
  }

  @Post('create-pm')
  async createPmr(
    @Body() dto: CreatePmContract.Request
  ): Promise<CreatePmContract.Response> {
    return this.authService.createUser<
      CreatePmContract.Request,
      CreatePmContract.Response
    >(CreatePmContract.exchange, CreatePmContract.routingKey, dto);
  }
}
