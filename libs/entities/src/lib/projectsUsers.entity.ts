import {
  Entity,
  CreateDateColumn,
  UpdateDateColumn,
  PrimaryColumn,
} from 'typeorm';

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

  @CreateDateColumn({
    name: 'created_at',
  })
  createdAt: Date;

  @UpdateDateColumn({
    name: 'updated_at',
  })
  updatedAt: Date;
}
