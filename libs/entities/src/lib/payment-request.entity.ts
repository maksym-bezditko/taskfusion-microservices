import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum PaymentRequestStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

@Entity({
  name: 'payment_requests',
})
export class PaymentRequestEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  projectId: number;

  @Column()
  clientUserId: number;

  @Column()
  comment: string;

  @Column()
  usdAmount: number;

  @Column()
  paymentPeriodStartDate: Date;

  @Column()
  paymentPeriodEndDate: Date;

  @Column({
    type: 'enum',
    enum: PaymentRequestStatus,
    name: 'status',
    default: PaymentRequestStatus.PENDING,
  })
  status: PaymentRequestStatus;

  @CreateDateColumn({
    name: 'created_at',
  })
  createdAt: Date;

  @UpdateDateColumn({
    name: 'updated_at',
  })
  updatedAt: Date;
}
