import {
  Entity,
  PrimaryGeneratedColumn,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
	OneToMany,
	Column,
} from 'typeorm';
import { ProjectEntity } from './project.entity';

@Entity({
  name: 'invites',
})
export class InviteEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToMany(() => ProjectEntity, (project) => project.id)
  @JoinColumn()
  projectId: number;

	@Column()
	clientUserId: number;

	@Column()
	pmUserId: number;

	@Column()
	expiresAt: Date;

	@Column()
	isActive: boolean;

  @CreateDateColumn({
    name: 'created_at',
  })
  createdAt: Date;

  @UpdateDateColumn({
    name: 'updated_at',
  })
  updatedAt: Date;
}
