import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

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
}
