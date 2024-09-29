import {
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Column,
  ManyToOne,
} from 'typeorm';
import { ProjectEntity } from './project.entity';

export enum InviteStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
}

@Entity({
  name: 'pm-invites',
})
export class PmInviteEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  projectId: number;

  @Column({
    name: 'client_user_id',
  })
  clientUserId: number;

  @Column({
    name: 'pm_user_id',
  })
  pmUserId: number;

  @Column({
    name: 'expires_at',
  })
  expiresAt: Date;

  @Column({
    type: 'enum',
    enum: InviteStatus,
    name: 'invite_status',
  })
  inviteStatus: InviteStatus;

  @CreateDateColumn({
    name: 'created_at',
  })
  createdAt: Date;

  @UpdateDateColumn({
    name: 'updated_at',
  })
  updatedAt: Date;

  @ManyToOne(() => ProjectEntity, (project) => project.pmInvites)
  project: ProjectEntity;
}
