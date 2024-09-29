import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  UpdateDateColumn,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { PmInviteEntity } from './pm-invite.entity';
import { DeveloperInviteEntity } from './developer-invite.entity';

@Entity({
  name: 'projects',
})
export class ProjectEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column()
  description: string;

  @Column()
  deadline: Date;

  @Column({
    name: 'client_user_id',
  })
  clientUserId: number;

  @CreateDateColumn({
    name: 'created_at',
  })
  createdAt: Date;

  @UpdateDateColumn({
    name: 'updated_at',
  })
  updatedAt: Date;

  @OneToMany(() => PmInviteEntity, (invite) => invite.project, { cascade: true })
  pmInvites: PmInviteEntity[];

  @OneToMany(() => DeveloperInviteEntity, (invite) => invite.project, { cascade: true })
  developerInvites: DeveloperInviteEntity[];
}
