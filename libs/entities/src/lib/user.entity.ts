import { Entity, Column, PrimaryGeneratedColumn, OneToOne } from 'typeorm';
import { ClientEntity } from './client.entity';
import { DeveloperEntity } from './developer.entity';
import { PmEntity } from './pm.entity';

export enum UserType {
  CLIENT = 'client',
  DEVELOPER = 'developer',
  PM = 'pm',
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
  description: string;

  @Column({
    nullable: true,
    default: true
  })
  telegram_id: string | null;

  @Column()
  password: string;

  @Column({
    type: 'enum',
    enum: UserType,
  })
  user_type: string;

  @Column({
    nullable: true,
    default: null,
    type: 'text',
  })
  refresh_token: string | null;

  @OneToOne(() => ClientEntity, (client) => client.user)
  client: ClientEntity;

  @OneToOne(() => DeveloperEntity, (developer) => developer.user)
  developer: DeveloperEntity;

  @OneToOne(() => PmEntity, (pm) => pm.user)
  pm: PmEntity;
}
