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

  @Column()
  clientUserId: number;

  @Column()
  pmUserId: number;

  @Column()
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