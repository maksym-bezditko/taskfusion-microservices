import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity({
  name: 'comments',
})
export class CommentEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    name: 'task_id',
  })
  taskId: number;

  @Column({
    name: 'user_id',
  })
  userId: number;
}
