import {
  Entity,
  CreateDateColumn,
  UpdateDateColumn,
  PrimaryColumn,
  Column,
} from 'typeorm';

export enum ProjectParticipantRole {
  DEVELOPER = 'Developer',
  PM = 'Project Manager',
}

@Entity({
  name: 'projects_users',
})
export class ProjectsUsersEntity {
  @PrimaryColumn({
    name: 'user_id',
  })
  userId: number;

  @PrimaryColumn({
    name: 'project_id',
  })
  projectId: number;

  @Column({
    type: 'enum',
    enum: ProjectParticipantRole,
  })
  role: ProjectParticipantRole;

  @CreateDateColumn({
    name: 'created_at',
  })
  createdAt: Date;

  @UpdateDateColumn({
    name: 'updated_at',
  })
  updatedAt: Date;
}
