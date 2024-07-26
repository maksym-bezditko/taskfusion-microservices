import { Controller } from '@nestjs/common';
import { ClientsService } from './clients.service';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { CreateClientContract } from '@taskfusion-microservices/contracts';

@Controller('clients')
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @MessagePattern(CreateClientContract.topic)
  async createUser(
    @Payload() dto: CreateClientContract.Request
  ): Promise<CreateClientContract.Response> {
    return this.clientsService.createClient(dto);
  }
}
