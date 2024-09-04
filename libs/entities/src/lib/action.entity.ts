import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { TaskEntity } from './task.entity';

@Entity({
  name: 'actions',
})
export class ActionEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column({
    name: 'task_id',
  })
  taskId: number;

  @Column({
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

  @ManyToOne(() => TaskEntity, (task) => task.actions)
  @JoinColumn({ name: 'task_id' })
  task: TaskEntity;
}
