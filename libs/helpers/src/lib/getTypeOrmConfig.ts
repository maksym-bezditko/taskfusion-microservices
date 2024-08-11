import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export const getTypeOrmConfig = (
  configService: ConfigService,
  entities: TypeOrmModuleOptions['entities']
): Promise<TypeOrmModuleOptions> | TypeOrmModuleOptions => {
  return {
    type: 'mysql',
    host: 'localhost',
    port: configService.getOrThrow('DB_PORT'),
    username: configService.getOrThrow('DB_USER'),
    password: configService.getOrThrow('DB_PASSWORD'),
    database: configService.getOrThrow('DB_NAME'),
    entities,
    synchronize: true,
  };
};
