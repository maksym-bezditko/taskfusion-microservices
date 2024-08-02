import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

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
}
