import { Entity, PrimaryGeneratedColumn, Column, JoinColumn, OneToOne } from 'typeorm';
import { UserEntity } from './user.entity';

@Entity({
  name: 'developers',
})
export class DeveloperEntity {
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
