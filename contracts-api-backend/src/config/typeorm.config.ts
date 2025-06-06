import { DataSource, DataSourceOptions } from 'typeorm';
import { config } from 'dotenv';
import { NftEntity } from '../contracts/entities/nft.entity';
import { AuctionEntity } from '../contracts/entities/auction.entity';
import { UserEntity } from '../contracts/entities/user.entity';
import { MissingConfigurationError } from '.././contracts/errors/MissingConfigurationError';
import { configValidationSchema } from './config.validation';

config();

const { error, value: env } = configValidationSchema.validate(process.env, {
  abortEarly: false,
  allowUnknown: true,
});

if (error) {
  throw new MissingConfigurationError(
    `Environment validation error:\n${error.message}`,
  );
}

const options: DataSourceOptions = {
  type: 'postgres',
  host: env.POSTGRES_HOST,
  port: Number(env.POSTGRES_PORT),
  username: env.POSTGRES_USER,
  password: env.POSTGRES_PASSWORD,
  database: env.POSTGRES_DATABASE,
  entities: [NftEntity, AuctionEntity, UserEntity],
  migrations: ['src/migrations/*.ts'],
  migrationsTableName: 'migrations',
  synchronize: false,
  logging: true,
};

export default new DataSource(options);
