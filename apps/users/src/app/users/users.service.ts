import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { UserEntity } from '@taskfusion-microservices/entities';
import { Repository } from 'typeorm';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>
  ) {}

  async createUser(email: string, password: string) {
    const user = this.userRepository.create({
      email,
      password,
    });

    await this.userRepository.save(user);

    return user;
  }
}
