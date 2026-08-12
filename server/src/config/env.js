import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env from the server root.
dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env') });

/**
 * Centralised, validated access to environment variables.
 * Throws at startup when required values are missing to fail fast.
 */
function required(name, fallback) {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  port: Number(process.env.PORT || 4000),
  clientUrl: required('CLIENT_URL', 'http://localhost:3000'),
  mongoUri: required('MONGO_URI', 'mongodb://127.0.0.1:27017/jiva'),
  jwtAccessSecret: required('JWT_ACCESS_SECRET', 'dev-access-secret'),
  jwtRefreshSecret: required('JWT_REFRESH_SECRET', 'dev-refresh-secret'),
  jwtAccessExpires: process.env.JWT_ACCESS_EXPIRES || '15m',
  jwtRefreshExpires: process.env.JWT_REFRESH_EXPIRES || '7d',
  appName: process.env.APP_NAME || 'JIVA',
  seedAdminEmail: process.env.SEED_ADMIN_EMAIL || 'admin@jiva.ai',
  seedAdminPassword: process.env.SEED_ADMIN_PASSWORD || 'admin123',
};
