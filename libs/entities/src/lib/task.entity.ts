import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity({
  name: 'tasks',
})
export class TaskEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    name: 'project_id',
  })
  projectId: number;

  @Column({
    name: 'developer_id',
  })
  developerId: number;
}
