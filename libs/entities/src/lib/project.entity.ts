import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  UpdateDateColumn,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { InviteEntity } from './invite.entity';

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
    name: 'pm_id',
    default: null,
    nullable: true,
  })
  pmId: number | null;

  @Column({
    name: 'client_id',
  })
  clientId: number;

  @CreateDateColumn({
    name: 'created_at',
  })
  createdAt: Date;

  @UpdateDateColumn({
    name: 'updated_at',
  })
  updatedAt: Date;

  @OneToMany(() => InviteEntity, (invite) => invite.project, { cascade: true })
  invites: InviteEntity[];
}
