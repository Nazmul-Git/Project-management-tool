import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

// Load environment variables
dotenv.config({
  path: path.resolve(__dirname, '../.env'),
});

// Environment schema validation
const envSchema = z.object({
  // Core Settings
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().regex(/^\d+$/).transform(Number),

  // JWT Configuration
  JWT_SECRET: z.string().min(32, 'JWT secret must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'Refresh secret must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  // CORS
  CORS_ORIGINS: z.string().default('http://localhost:3000,http://127.0.0.1:3000'),

  // Redis
  REDIS_URL: z.string().url().startsWith('redis://').default('redis://localhost:6379'),

  // Database (example - add your actual DB config)
  DB_HOST: z.string().default('localhost'),
  DB_PORT: z.string().regex(/^\d+$/).transform(Number),
  DB_NAME: z.string().default('myapp'),
  DB_USER: z.string().default('postgres'),
  DB_PASSWORD: z.string().default('postgres'),
});

// Validate environment variables
const envValidation = envSchema.safeParse(process.env);

if (!envValidation.success) {
  console.error('❌ Invalid environment variables:');
  console.error(envValidation.error.flatten());
  process.exit(1);
}

// Application configuration
export const config = {
  // Environment
  env: envValidation.data.NODE_ENV,
  port: envValidation.data.PORT,
  isProduction: envValidation.data.NODE_ENV === 'production',
  isDevelopment: envValidation.data.NODE_ENV === 'development',
  isTest: envValidation.data.NODE_ENV === 'test',

  // CORS
  corsOrigins: envValidation.data.CORS_ORIGINS.split(',').map(origin => origin.trim()),

  // JWT
  jwt: {
    secret: envValidation.data.JWT_SECRET,
    refreshSecret: envValidation.data.JWT_REFRESH_SECRET,
    expiresIn: envValidation.data.JWT_EXPIRES_IN,
    refreshExpiresIn: envValidation.data.JWT_REFRESH_EXPIRES_IN,
  },

  // Redis
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    ttl: {
      projects: 3600, // 1 hour
      tasks: 1800,    // 30 minutes
    }
  },

  // Database
  database: {
    host: envValidation.data.DB_HOST,
    port: envValidation.data.DB_PORT,
    name: envValidation.data.DB_NAME,
    user: envValidation.data.DB_USER,
    password: envValidation.data.DB_PASSWORD,
  }
} as const;

export type Config = typeof config