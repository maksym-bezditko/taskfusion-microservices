import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateClientContract } from '@taskfusion-microservices/contracts';
import { ClientEntity, UserType } from '@taskfusion-microservices/entities';
import { Repository } from 'typeorm';

@Injectable()
export class ClientsService {
  constructor(
    @InjectRepository(ClientEntity)
    private readonly clientRepository: Repository<ClientEntity>
  ) {}

  async createClient(
    dto: CreateClientContract.Request
  ): Promise<CreateClientContract.Response> {
    const client = this.clientRepository.create({
      user: {
        email: dto.email,
        password: dto.password,
        user_type: UserType.CLIENT,
      },
    });

    const savedClient = await this.clientRepository.save(client);

    return {
      id: savedClient.id,
    };
  }
}
