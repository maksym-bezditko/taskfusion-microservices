import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity({
  name: 'comments',
})
export class CommentEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  task_id: number;

  @Column()
  user_id: number;
}
