import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum PaymentRequestStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
}

@Entity({
  name: 'payment_requests',
})
export class PaymentRequestEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    name: 'project_id',
  })
  projectId: number;

  @Column({
    name: 'client_user_id',
  })
  clientUserId: number;

  @Column()
  comment: string;

  @Column({
    name: 'usd_amount',
  })
  usdAmount: number;

  @Column({
    name: 'payment_period_start_date',
  })
  paymentPeriodStartDate: Date;

  @Column({
    name: 'payment_period_end_date',
  })
  paymentPeriodEndDate: Date;

  @Column({
    name: 'checkout_session_id',
    nullable: true,
    default: null,
  })
  checkoutSessionId: string | null;

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
