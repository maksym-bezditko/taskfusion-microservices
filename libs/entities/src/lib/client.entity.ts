import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity({
	name: 'clients',
})
export class ClientEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  user_id: number;

  @Column()
  bio: string;
}