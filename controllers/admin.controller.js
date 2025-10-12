import { successResponse, errorResponse } from '../utils/response.js';
import { anthemService } from '../services/anthem.service.js';
import { statsService } from '../services/stats.service.js';
import { userService } from '../services/user.service.js';
import { queueService } from '../services/queue.service.js';

/**
 * Admin Controller
 * Handles administrative operations and system management
 */

export const adminController = {
  /**
   * Generate anthem (admin operation)
   * POST /api/v1/admin/anthems/generate
   * Body: { date: "YYYY-MM-DD" }
   */
  async generateAnthem(req, res) {
    try {
      console.log('ADMIN_CONTROLLER: POST /api/v1/admin/anthems/generate');

      const { date } = req.body;

      if (!date) {
        return errorResponse(res, 'Date is required', 400);
      }

      // Validate date format
      const dateObj = new Date(date);
      if (isNaN(dateObj.getTime())) {
        return errorResponse(res, 'Invalid date format. Use YYYY-MM-DD', 400);
      }

      // Initialize queue service if needed
      if (!queueService.isConnected) {
        await queueService.initialize();
      }

      const result = await anthemService.generateAnthem(date);

      successResponse(res, result, 'Anthem generation started successfully');
    } catch (error) {
      console.error('ADMIN_CONTROLLER: Error generating anthem:', error);
      errorResponse(res, error.message, 500);
    }
  },

  /**
   * Get system health status
   * GET /api/v1/admin/system/health
   */
  async getSystemHealth(req, res) {
    try {
      console.log('ADMIN_CONTROLLER: GET /api/v1/admin/system/health');

      // Check database connectivity
      const dbHealth = await checkDatabaseHealth();

      // Check Redis connectivity
      const redisHealth = await checkRedisHealth();

      // Check queue status
      const queueHealth = await checkQueueHealth();

      // Overall health status
      const isHealthy = dbHealth.status === 'healthy' &&
                       redisHealth.status === 'healthy' &&
                       queueHealth.status === 'healthy';

      const healthData = {
        status: isHealthy ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
        services: {
          database: dbHealth,
          redis: redisHealth,
          queue: queueHealth
        },
        uptime: process.uptime(),
        memory: process.memoryUsage()
      };

      const statusCode = isHealthy ? 200 : 503;
      successResponse(res, healthData, 'System health check completed', statusCode);
    } catch (error) {
      console.error('ADMIN_CONTROLLER: Error checking system health:', error);
      errorResponse(res, error.message, 500);
    }
  },

  /**
   * Get admin statistics overview
   * GET /api/v1/admin/stats/overview
   */
  async getStatsOverview(req, res) {
    try {
      console.log('ADMIN_CONTROLLER: GET /api/v1/admin/stats/overview');

      const stats = await statsService.getOverviewStats();

      successResponse(res, stats, 'Admin statistics retrieved successfully');
    } catch (error) {
      console.error('ADMIN_CONTROLLER: Error getting stats overview:', error);
      errorResponse(res, error.message, 500);
    }
  },

  /**
   * Ban user (admin operation)
   * POST /api/v1/admin/users/:userId/ban
   * Body: { reason: string }
   */
  async banUser(req, res) {
    try {
      console.log('ADMIN_CONTROLLER: POST /api/v1/admin/users/:userId/ban');

      const { userId } = req.params;
      const { reason } = req.body;

      if (!reason || reason.trim().length === 0) {
        return errorResponse(res, 'Ban reason is required', 400);
      }

      // Get admin ID from authenticated user (assuming middleware sets this)
      const adminId = req.user?.userId;

      const result = await userService.banUser(userId, reason, adminId);

      successResponse(res, result, 'User banned successfully');
    } catch (error) {
      console.error('ADMIN_CONTROLLER: Error banning user:', error);

      if (error.message.includes('not found')) {
        return errorResponse(res, error.message, 404);
      }

      if (error.message.includes('already banned')) {
        return errorResponse(res, error.message, 400);
      }

      errorResponse(res, error.message, 500);
    }
  }
};

/**
 * Check database health
 */
async function checkDatabaseHealth() {
  try {
    // Simple query to test database connectivity
    const result = await statsService.getUserStats();
    return {
      status: 'healthy',
      response_time_ms: Date.now() - Date.now(), // Placeholder
      details: 'Database connection successful'
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message,
      details: 'Database connection failed'
    };
  }
}

/**
 * Check Redis health
 */
async function checkRedisHealth() {
  try {
    // Check if queue service is connected
    const isConnected = queueService.isConnected;
    return {
      status: isConnected ? 'healthy' : 'unhealthy',
      details: isConnected ? 'Redis connection successful' : 'Redis connection failed'
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message,
      details: 'Redis health check failed'
    };
  }
}

/**
 * Check queue health
 */
async function checkQueueHealth() {
  try {
    const queueStats = await queueService.getQueueStats();
    return {
      status: 'healthy',
      details: 'Queue service operational',
      stats: queueStats
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message,
      details: 'Queue service health check failed'
    };
  }
}