import { Entity, PrimaryGeneratedColumn, Column, JoinColumn, OneToOne } from 'typeorm';
import { UserEntity } from './user.entity';

@Entity({
	name: 'pms',
})
export class PmEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  user_id: number;

  @Column()
  bio: string;

  @OneToOne(() => UserEntity, user => user.client)
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;
}
