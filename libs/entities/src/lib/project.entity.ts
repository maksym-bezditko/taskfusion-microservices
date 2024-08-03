import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

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
}
