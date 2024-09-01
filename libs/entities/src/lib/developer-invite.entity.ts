import {
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Column,
  ManyToOne,
} from 'typeorm';
import { ProjectEntity } from './project.entity';
import { InviteStatus } from './pm-invite.entity';

@Entity({
  name: 'developer-invites',
})
export class DeveloperInviteEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  projectId: number;

  @Column()
  pmUserId: number;

  @Column()
  developerUserId: number;

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

  @ManyToOne(() => ProjectEntity, (project) => project.developerInvites)
  project: ProjectEntity;
}
