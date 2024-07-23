import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity({
  name: 'tasks',
})
export class TaskEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  project_id: number;

  @Column()
  developer_id: number;
}
