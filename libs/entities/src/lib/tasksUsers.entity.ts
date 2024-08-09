import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({
  name: 'tasks_developers',
})
export class TasksDevelopersEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    name: 'task_id',
  })
  taskId: number;

  @Column({
    name: 'developer_id',
  })
  developerId: number;

  @CreateDateColumn({
    name: 'created_at',
  })
  public createdAt: Date;

  @UpdateDateColumn({
    name: 'updated_at',
  })
  public updatedAt: Date;
}
