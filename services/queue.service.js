import { createClient } from 'redis';
import { redisConfig } from '../config/redis.config.js';

export class QueueService {
  constructor() {
    this.client = null;
    this.isConnected = false;
  }

  /**
   * Initialize Redis connection
   */
  async initialize() {
    try {
      this.client = createClient({
        host: redisConfig.host,
        port: redisConfig.port,
        password: redisConfig.password,
        db: redisConfig.db || 0
      });

      this.client.on('error', (err) => {
        console.error('QUEUE_SERVICE: Redis connection error:', err);
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        console.log('QUEUE_SERVICE: Connected to Redis');
        this.isConnected = true;
      });

      await this.client.connect();
    } catch (error) {
      console.error('QUEUE_SERVICE: Failed to initialize Redis:', error);
      throw error;
    }
  }

  /**
   * Add job to queue
   * @param {string} jobType - Type of job (e.g., 'anthem_generation')
   * @param {Object} data - Job data
   * @param {Object} options - Job options (priority, delay, etc.)
   * @returns {Promise<string>} Job ID
   */
  async addJob(jobType, data, options = {}) {
    if (!this.client || !this.isConnected) {
      throw new Error('Redis client not connected');
    }

    try {
      const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const job = {
        id: jobId,
        type: jobType,
        data: data,
        status: 'queued',
        createdAt: new Date().toISOString(),
        priority: options.priority || 1,
        delay: options.delay || 0,
        attempts: 0,
        maxAttempts: options.maxAttempts || 3
      };

      const queueKey = `queue:${jobType}`;
      const jobKey = `job:${jobId}`;

      // Store job data
      await this.client.set(jobKey, JSON.stringify(job));

      // Add to queue with priority (higher priority = lower score)
      const score = options.delay > 0 ? Date.now() + options.delay : job.priority;
      await this.client.zAdd(queueKey, { score, value: jobId });

      console.log(`QUEUE_SERVICE: Added job ${jobId} to queue ${jobType}`);

      return jobId;
    } catch (error) {
      console.error('QUEUE_SERVICE: Error adding job:', error);
      throw error;
    }
  }

  /**
   * Get next job from queue
   * @param {string} jobType - Type of job to get
   * @returns {Promise<Object|null>} Job data or null if no jobs
   */
  async getNextJob(jobType) {
    if (!this.client || !this.isConnected) {
      throw new Error('Redis client not connected');
    }

    try {
      const queueKey = `queue:${jobType}`;

      // Get the job with lowest score (highest priority)
      const jobs = await this.client.zRange(queueKey, 0, 0);
      if (jobs.length === 0) {
        return null;
      }

      const jobId = jobs[0];
      const jobKey = `job:${jobId}`;

      // Get job data
      const jobData = await this.client.get(jobKey);
      if (!jobData) {
        // Clean up orphaned job ID from queue
        await this.client.zRem(queueKey, jobId);
        return null;
      }

      const job = JSON.parse(jobData);

      // Check if job is delayed
      if (job.delay > 0 && Date.now() < job.createdAt + job.delay) {
        return null; // Job is still delayed
      }

      // Mark job as processing
      job.status = 'processing';
      job.startedAt = new Date().toISOString();
      job.attempts += 1;

      await this.client.set(jobKey, JSON.stringify(job));

      console.log(`QUEUE_SERVICE: Retrieved job ${jobId} from queue ${jobType}`);

      return job;
    } catch (error) {
      console.error('QUEUE_SERVICE: Error getting next job:', error);
      throw error;
    }
  }

  /**
   * Complete a job
   * @param {string} jobId - Job ID
   * @param {Object} result - Job result
   */
  async completeJob(jobId, result = {}) {
    if (!this.client || !this.isConnected) {
      throw new Error('Redis client not connected');
    }

    try {
      const jobKey = `job:${jobId}`;
      const jobData = await this.client.get(jobKey);

      if (!jobData) {
        console.warn(`QUEUE_SERVICE: Job ${jobId} not found for completion`);
        return;
      }

      const job = JSON.parse(jobData);
      const queueKey = `queue:${job.type}`;

      // Remove from queue
      await this.client.zRem(queueKey, jobId);

      // Update job status
      job.status = 'completed';
      job.completedAt = new Date().toISOString();
      job.result = result;

      await this.client.set(jobKey, JSON.stringify(job));

      console.log(`QUEUE_SERVICE: Completed job ${jobId}`);
    } catch (error) {
      console.error('QUEUE_SERVICE: Error completing job:', error);
      throw error;
    }
  }

  /**
   * Fail a job
   * @param {string} jobId - Job ID
   * @param {Error} error - Error that occurred
   */
  async failJob(jobId, error) {
    if (!this.client || !this.isConnected) {
      throw new Error('Redis client not connected');
    }

    try {
      const jobKey = `job:${jobId}`;
      const jobData = await this.client.get(jobKey);

      if (!jobData) {
        console.warn(`QUEUE_SERVICE: Job ${jobId} not found for failure`);
        return;
      }

      const job = JSON.parse(jobData);
      const queueKey = `queue:${job.type}`;

      job.status = 'failed';
      job.failedAt = new Date().toISOString();
      job.error = {
        message: error.message,
        stack: error.stack
      };

      // Check if job should be retried
      if (job.attempts < job.maxAttempts) {
        // Re-queue with backoff delay
        const backoffDelay = Math.pow(2, job.attempts) * 1000; // Exponential backoff
        job.delay = backoffDelay;
        job.status = 'retry';

        await this.client.zAdd(queueKey, {
          score: Date.now() + backoffDelay,
          value: jobId
        });

        console.log(`QUEUE_SERVICE: Retrying job ${jobId} in ${backoffDelay}ms`);
      } else {
        // Remove from queue - max retries reached
        await this.client.zRem(queueKey, jobId);
        console.log(`QUEUE_SERVICE: Job ${jobId} failed permanently after ${job.maxAttempts} attempts`);
      }

      await this.client.set(jobKey, JSON.stringify(job));
    } catch (error) {
      console.error('QUEUE_SERVICE: Error failing job:', error);
      throw error;
    }
  }

  /**
   * Get job status
   * @param {string} jobId - Job ID
   * @returns {Promise<Object|null>} Job status
   */
  async getJobStatus(jobId) {
    if (!this.client || !this.isConnected) {
      throw new Error('Redis client not connected');
    }

    try {
      const jobKey = `job:${jobId}`;
      const jobData = await this.client.get(jobKey);

      if (!jobData) {
        return null;
      }

      const job = JSON.parse(jobData);
      return {
        id: job.id,
        type: job.type,
        status: job.status,
        createdAt: job.createdAt,
        startedAt: job.startedAt,
        completedAt: job.completedAt,
        failedAt: job.failedAt,
        attempts: job.attempts,
        maxAttempts: job.maxAttempts,
        progress: job.progress || 0
      };
    } catch (error) {
      console.error('QUEUE_SERVICE: Error getting job status:', error);
      throw error;
    }
  }

  /**
   * Get queue statistics
   * @param {string} jobType - Optional job type filter
   * @returns {Promise<Object>} Queue statistics
   */
  async getQueueStats(jobType = null) {
    if (!this.client || !this.isConnected) {
      throw new Error('Redis client not connected');
    }

    try {
      const stats = {};

      if (jobType) {
        const queueKey = `queue:${jobType}`;
        const queueLength = await this.client.zCard(queueKey);
        stats[jobType] = { queued: queueLength };
      } else {
        // Get all queue types
        const keys = await this.client.keys('queue:*');
        for (const key of keys) {
          const queueType = key.replace('queue:', '');
          const queueLength = await this.client.zCard(key);
          stats[queueType] = { queued: queueLength };
        }
      }

      return stats;
    } catch (error) {
      console.error('QUEUE_SERVICE: Error getting queue stats:', error);
      throw error;
    }
  }

  /**
   * Clean up old completed jobs
   * @param {number} maxAge - Maximum age in milliseconds (default: 7 days)
   */
  async cleanup(maxAge = 7 * 24 * 60 * 60 * 1000) {
    if (!this.client || !this.isConnected) {
      throw new Error('Redis client not connected');
    }

    try {
      const cutoffTime = Date.now() - maxAge;
      const jobKeys = await this.client.keys('job:*');
      let cleanedCount = 0;

      for (const jobKey of jobKeys) {
        const jobData = await this.client.get(jobKey);
        if (jobData) {
          const job = JSON.parse(jobData);
          if ((job.status === 'completed' || job.status === 'failed') &&
              new Date(job.completedAt || job.failedAt).getTime() < cutoffTime) {
            await this.client.del(jobKey);
            cleanedCount++;
          }
        }
      }

      console.log(`QUEUE_SERVICE: Cleaned up ${cleanedCount} old jobs`);
      return cleanedCount;
    } catch (error) {
      console.error('QUEUE_SERVICE: Error during cleanup:', error);
      throw error;
    }
  }

  /**
   * Close Redis connection
   */
  async close() {
    if (this.client && this.isConnected) {
      await this.client.quit();
      this.isConnected = false;
      console.log('QUEUE_SERVICE: Disconnected from Redis');
    }
  }
}

// Create and export queue service instance
export const queueService = new QueueService();

export default queueService;