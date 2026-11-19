import { config } from 'dotenv';
config();

const isProduction = process.env.NODE_ENV === 'production';

export const AegisSecurityConfig = {
  enabled: process.env.AEGIS_GUARD_ENABLED !== 'false',
  mode: (process.env.AEGIS_GUARD_MODE as 'off' | 'monitor' | 'block') || (isProduction ? 'block' : 'monitor'),
  maxJsonBytes: Number(process.env.AEGIS_GUARD_MAX_JSON_BYTES) || 1048576, // 1MB
  maxWsBytes: Number(process.env.AEGIS_GUARD_MAX_WS_BYTES) || 5120, // 5KB
  maxUploadBytes: Number(process.env.AEGIS_GUARD_MAX_UPLOAD_BYTES) || 26214400, // 25MB
  rateLimitWindowMs: Number(process.env.AEGIS_GUARD_RATE_LIMIT_WINDOW_MS) || 60000,
  rateLimitMax: Number(process.env.AEGIS_GUARD_RATE_LIMIT_MAX) || 120,
  logLevel: process.env.AEGIS_GUARD_LOG_LEVEL || 'warn',
};
