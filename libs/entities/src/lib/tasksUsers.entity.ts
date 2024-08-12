import {
  Entity,
  CreateDateColumn,
  UpdateDateColumn,
  PrimaryColumn,
} from 'typeorm';

@Entity({
  name: 'tasks_users',
})
export class TasksUsersEntity {
  @PrimaryColumn({
    name: 'task_id',
  })
  taskId: number;

  @PrimaryColumn({
    name: 'user_id',
  })
  userId: number;

  @CreateDateColumn({
    name: 'created_at',
  })
  createdAt: Date;

  @UpdateDateColumn({
    name: 'updated_at',
  })
  updatedAt: Date;
}
