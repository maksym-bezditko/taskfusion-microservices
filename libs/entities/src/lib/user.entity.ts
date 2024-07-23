import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

export enum UserType {
  CLIENT = 'client',
  DEVELOPER = 'developer',
  PM = 'pm',
}

@Entity({
  name: 'users',
})
export class UserEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    unique: true,
  })
  login: string;

  @Column()
  password: string;

  @Column({
    type: 'enum',
    enum: UserType,
  })
  user_type: string;
}
