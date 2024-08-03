import { Entity, PrimaryGeneratedColumn, JoinColumn, OneToOne } from 'typeorm';
import { UserEntity } from './user.entity';

@Entity({
	name: 'clients',
})
export class ClientEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => UserEntity, (user) => user.client)
  @JoinColumn()
  user: UserEntity;
}