import { IsEmail, IsString, Min } from 'class-validator';

export namespace CreatePmContract {
  export const topic = 'create-pm';

  export class Response {
    id: number;
  }

  export class Request {
    @IsEmail()
    email: string;

    @IsString()
    @Min(6)
    password: string;
  }
}
