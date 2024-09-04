import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { CommentEntity } from './comment.entity';
import { ActionEntity } from './action.entity';

export enum TaskStatus {
  TO_DO = 'To do',
  IN_PROGRESS = 'In progress',
  CLOSED = 'Closed',
  FROZEN = 'Frozen',
}

export enum TaskPriority {
  LOW = 'Low',
  MEDIUM = 'Medium',
  HIGH = 'High',
}

@Entity({
  name: 'tasks',
})
export class TaskEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column()
  description: string;

  @Column({
    type: 'enum',
    enum: TaskPriority,
    name: 'task_priority',
    default: TaskPriority.MEDIUM,
  })
  taskPriority: TaskPriority;

  @Column({
    type: 'enum',
    enum: TaskStatus,
    name: 'task_status',
    default: TaskStatus.TO_DO,
  })
  taskStatus: TaskStatus;

  @Column()
  deadline: Date;

  @Column({
    name: 'project_id',
  })
  projectId: number;

  @CreateDateColumn({
    name: 'created_at',
  })
  createdAt: Date;

  @UpdateDateColumn({
    name: 'updated_at',
  })
  updatedAt: Date;

  @OneToMany(() => CommentEntity, (comment) => comment.task)
  comments: CommentEntity[];

  @OneToMany(() => ActionEntity, (action) => action.task)
  actions: ActionEntity[];
}
