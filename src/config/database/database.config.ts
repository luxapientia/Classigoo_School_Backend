import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  mongodb: {
    uri: process.env.MONGODB_URI,
  },
  postgres: {
    host: process.env.POSTGRES_DB_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_DB_PORT || '5432', 10),
    user: process.env.POSTGRES_DB_USER,
    password: process.env.POSTGRES_DB_PASSWORD,
    name: process.env.POSTGRES_DB_NAME,
  },
  // uri: process.env.MONGODB_URI,
  // host: process.env.DB_HOST || 'localhost',
  // port: parseInt(process.env.DB_PORT || '27017', 10),
  // username: process.env.DB_USERNAME,
  // password: process.env.DB_PASSWORD,
  // database: process.env.DB_NAME,
}));
