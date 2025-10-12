/**
 * Redis Configuration
 * Queue and caching configuration for Redis
 */

export const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || null,
  db: parseInt(process.env.REDIS_DB) || 0,
  retryDelay: parseInt(process.env.REDIS_RETRY_DELAY) || 5000,
  maxRetries: parseInt(process.env.REDIS_MAX_RETRIES) || 3,
  lazyConnect: true,
  keyPrefix: 'humn:'
};

export default redisConfig;