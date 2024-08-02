import { Entity, Column, PrimaryGeneratedColumn, OneToOne } from 'typeorm';
import { ClientEntity } from './client.entity';
import { DeveloperEntity } from './developer.entity';
import { PmEntity } from './pm.entity';

export enum UserType {
  CLIENT = 'Client',
  DEVELOPER = 'Developer',
  PM = 'Project Manager',
}

@Entity({
  name: 'users',
})
export class UserEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    unique: true,
  })
  email: string;

  @Column()
  name: string;

  @Column()
  description: string;

  @Column({
    nullable: true,
    default: true,
    name: 'telegram_id',
  })
  telegramId: string | null;

  @Column()
  password: string;

  @Column({
    type: 'enum',
    enum: UserType,
    name: 'user_type',
  })
  userType: string;

  @Column({
    nullable: true,
    default: null,
    type: 'text',
    name: 'refresh_token',
  })
  refreshToken: string | null;

  @OneToOne(() => ClientEntity, (client) => client.user)
  client: ClientEntity;

  @OneToOne(() => DeveloperEntity, (developer) => developer.user)
  developer: DeveloperEntity;

  @OneToOne(() => PmEntity, (pm) => pm.user)
  pm: PmEntity;
}
