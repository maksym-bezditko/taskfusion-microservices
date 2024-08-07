import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

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

  @CreateDateColumn({
    name: 'created_at',
  })
  public createdAt: Date;

  @UpdateDateColumn({
    name: 'updated_at',
  })
  public updatedAt: Date;
}
