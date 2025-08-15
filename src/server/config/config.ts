// src/config/config.ts
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({
  path: path.resolve(__dirname, '../../.env'), // Adjust path as needed
});

// Type-safe configuration
export const config = {
  // Server Configuration
  port: parseInt(process.env.PORT || '3000', 10),
  env: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isDevelopment: process.env.NODE_ENV === 'development',
  isTest: process.env.NODE_ENV === 'test',

  // CORS
  corsOrigins: process.env.CORS_ORIGINS?.split(',').map(origin => origin.trim()) || [
    'http://localhost:3000',
    'http://127.0.0.1:3000'
  ],

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'your_default_secret_32_chars_min',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'your_default_refresh_secret_32_chars_min',
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    issuer: 'your-app-name',
    audience: 'your-app-client',
  },

  // Redis
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    ttl: {
      user: 3600,        // 1 hour
      session: 86400,    // 1 day
      projects: 3600,    // 1 hour
      project: 1800      // 30 minutes
    },
    maxRetries: 3,
    retryDelay: 5000,    // 5 seconds
  },

  // Rate Limiting
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,                 // Limit each IP to 100 requests per window
  },

  // Database (if you're using one)
  database: {
    url: process.env.DATABASE_URL,
    pool: {
      min: 2,
      max: 10,
    },
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE || 'app.log',
  },

  // New Features
  features: {
    enableSwagger: process.env.ENABLE_SWAGGER === 'true',
    maintenanceMode: process.env.MAINTENANCE_MODE === 'true',
    apiVersion: process.env.API_VERSION || 'v1',
  },
} as const;

export type Config = typeof config;

// Optional: Add runtime validation
if (!process.env.JWT_SECRET && config.isProduction) {
  console.error('FATAL ERROR: JWT_SECRET is not defined in production');
  process.exit(1);
}