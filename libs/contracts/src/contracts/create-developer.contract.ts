import { IsEmail, IsString, Min } from 'class-validator';

export namespace CreateDeveloperContract {
  export const topic = 'create-developer';

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
