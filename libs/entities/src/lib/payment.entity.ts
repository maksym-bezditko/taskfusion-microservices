import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity({
  name: 'payments',
})
export class PaymentEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  project_id: number;

  @Column()
  amount: number;
}
