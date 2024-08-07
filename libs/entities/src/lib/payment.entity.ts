import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({
  name: 'payments',
})
export class PaymentEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    name: 'project_id',
  })
  projectId: number;

  @Column()
  amount: number;

  @CreateDateColumn({
    name: 'created_at',
  })
  public createdAt: Date;

  @UpdateDateColumn({
    name: 'updated_at',
  })
  public updatedAt: Date;
}
