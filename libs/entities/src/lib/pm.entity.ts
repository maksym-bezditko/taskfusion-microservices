import { Entity, PrimaryGeneratedColumn, JoinColumn, OneToOne } from 'typeorm';
import { UserEntity } from './user.entity';

@Entity({
	name: 'pms',
})
export class PmEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => UserEntity, (user) => user.pm)
  @JoinColumn()
  user: UserEntity;
}
