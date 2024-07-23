import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export const getTypeOrmConfig = (
  configService: ConfigService,
  entities: TypeOrmModuleOptions['entities']
): Promise<TypeOrmModuleOptions> | TypeOrmModuleOptions => {
  return {
    type: 'mysql',
    host: 'localhost',
    port: configService.get('DB_PORT'),
    username: configService.get('DB_USER'),
    password: configService.get('DB_PASSWORD'),
    database: configService.get('DB_NAME'),
    entities,
    synchronize: true,
  };
};
