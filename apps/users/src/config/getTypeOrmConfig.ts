import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { UserEntity } from '@taskfusion-microservices/entities';

export const getTypeOrmConfig = (
  configService: ConfigService
): Promise<TypeOrmModuleOptions> | TypeOrmModuleOptions => {
  return {
    type: 'mysql',
    host: 'localhost',
    port: 3306,
    username: configService.get('DB_USER'),
    password: configService.get('DB_PASSWORD'),
    database: configService.get('DB_NAME'),
    entities: [UserEntity],
    synchronize: true,
  };
};
