import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity({
  name: 'projects',
})
export class ProjectEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  pm_id: number;

  @Column()
  client_id: number;
}
