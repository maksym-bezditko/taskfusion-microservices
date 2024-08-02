import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity({
  name: 'projects',
})
export class ProjectEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    name: 'pm_id',
  })
  pmId: number;

  @Column({
    name: 'client_id',
  })
  clientId: number;
}
