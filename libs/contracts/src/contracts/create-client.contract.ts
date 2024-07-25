import { IsEmail, IsString, Min } from 'class-validator';

export namespace CreateClientContract {
  export const topic = 'create-client';

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
