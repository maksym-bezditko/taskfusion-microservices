import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

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
}
