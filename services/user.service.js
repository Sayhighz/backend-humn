import { userModel } from '../models/user.model.js';
import { dailyAnthemModel } from '../models/dailyAnthem.model.js';

export class UserService {
  /**
   * Ban a user
   * @param {string} userId - User ID to ban
   * @param {string} reason - Reason for banning
   * @param {string} adminId - Admin performing the ban (optional)
   * @returns {Promise<Object>} Ban result
   */
  async banUser(userId, reason, adminId = null) {
    try {
      console.log(`USER_SERVICE: Banning user ${userId} for reason: ${reason}`);

      // Check if user exists
      const user = await userModel.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Check if user is already banned
      if (user.is_banned) {
        throw new Error('User is already banned');
      }

      // Update user ban status
      const updatedUser = await userModel.update(userId, {
        is_banned: true,
        ban_reason: reason,
        updated_at: new Date()
      });

      // Log the ban action
      await this.logAdminAction(adminId, 'ban_user', userId, {
        reason,
        previous_status: user.is_banned
      });

      console.log(`USER_SERVICE: Successfully banned user ${userId}`);

      return {
        success: true,
        userId,
        banned: true,
        reason,
        bannedAt: new Date().toISOString()
      };

    } catch (error) {
      console.error('USER_SERVICE: Error banning user:', error);
      throw error;
    }
  }

  /**
   * Unban a user
   * @param {string} userId - User ID to unban
   * @param {string} adminId - Admin performing the unban (optional)
   * @returns {Promise<Object>} Unban result
   */
  async unbanUser(userId, adminId = null) {
    try {
      console.log(`USER_SERVICE: Unbanning user ${userId}`);

      // Check if user exists
      const user = await userModel.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Check if user is banned
      if (!user.is_banned) {
        throw new Error('User is not banned');
      }

      // Update user ban status
      const updatedUser = await userModel.update(userId, {
        is_banned: false,
        ban_reason: null,
        updated_at: new Date()
      });

      // Log the unban action
      await this.logAdminAction(adminId, 'unban_user', userId, {
        previous_ban_reason: user.ban_reason
      });

      console.log(`USER_SERVICE: Successfully unbanned user ${userId}`);

      return {
        success: true,
        userId,
        banned: false,
        unbannedAt: new Date().toISOString()
      };

    } catch (error) {
      console.error('USER_SERVICE: Error unbanning user:', error);
      throw error;
    }
  }

  /**
   * Get user details for admin
   * @param {string} userId - User ID
   * @returns {Promise<Object>} User details
   */
  async getUserDetails(userId) {
    try {
      const user = await userModel.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Get user statistics
      const userStats = await this.getUserStatistics(userId);

      // Get recent contributions
      const recentContributions = await this.getUserRecentContributions(userId);

      return {
        user: {
          userId: user.user_id,
          worldId: user.world_id,
          username: user.username,
          email: user.email,
          countryCode: user.country_code,
          city: user.city,
          isVerified: user.is_verified,
          isActive: user.is_active,
          isBanned: user.is_banned,
          banReason: user.ban_reason,
          createdAt: user.created_at,
          updatedAt: user.updated_at,
          lastActiveAt: user.last_active_at
        },
        statistics: userStats,
        recentContributions
      };

    } catch (error) {
      console.error('USER_SERVICE: Error getting user details:', error);
      throw error;
    }
  }

  /**
   * Get user statistics
   * @param {string} userId - User ID
   * @returns {Promise<Object>} User statistics
   */
  async getUserStatistics(userId) {
    const queryText = `
      SELECT
        COUNT(vc.contribution_id) as total_contributions,
        COUNT(DISTINCT DATE(vc.recorded_at AT TIME ZONE 'UTC')) as days_contributed,
        COUNT(DISTINCT vc.country_code) as countries_contributed,
        MAX(vc.recorded_at) as last_contribution_date,
        MIN(vc.recorded_at) as first_contribution_date,
        AVG(vc.duration_ms) as avg_contribution_duration
      FROM voice_contributions vc
      WHERE vc.user_id = $1 AND vc.status = 'processed'
    `;

    const result = await dailyAnthemModel.customQuery(queryText, [userId]);
    return result[0];
  }

  /**
   * Get user's recent contributions
   * @param {string} userId - User ID
   * @param {number} limit - Number of contributions to return
   * @returns {Promise<Array>} Recent contributions
   */
  async getUserRecentContributions(userId, limit = 10) {
    const queryText = `
      SELECT
        vc.contribution_id,
        vc.anthem_id,
        vc.audio_url,
        vc.duration_ms,
        vc.country_code,
        vc.city,
        vc.recorded_at,
        vc.status,
        da.status as anthem_status
      FROM voice_contributions vc
      LEFT JOIN daily_anthems da ON vc.anthem_id = da.anthem_id
      WHERE vc.user_id = $1
      ORDER BY vc.recorded_at DESC
      LIMIT $2
    `;

    const result = await dailyAnthemModel.customQuery(queryText, [userId, limit]);
    return result;
  }

  /**
   * Search users for admin
   * @param {string} query - Search query
   * @param {Object} filters - Additional filters
   * @param {number} page - Page number
   * @param {number} limit - Results per page
   * @returns {Promise<Object>} Search results
   */
  async searchUsers(query, filters = {}, page = 1, limit = 20) {
    try {
      const { limit: limitValue, offset } = userModel.buildPagination(page, limit);

      let whereConditions = [];
      let params = [];
      let paramIndex = 1;

      // Add search query
      if (query) {
        whereConditions.push(`(
          username ILIKE $${paramIndex} OR
          email ILIKE $${paramIndex} OR
          world_id ILIKE $${paramIndex}
        )`);
        params.push(`%${query}%`);
        paramIndex++;
      }

      // Add filters
      if (filters.isBanned !== undefined) {
        whereConditions.push(`is_banned = $${paramIndex}`);
        params.push(filters.isBanned);
        paramIndex++;
      }

      if (filters.isActive !== undefined) {
        whereConditions.push(`is_active = $${paramIndex}`);
        params.push(filters.isActive);
        paramIndex++;
      }

      if (filters.countryCode) {
        whereConditions.push(`country_code = $${paramIndex}`);
        params.push(filters.countryCode);
        paramIndex++;
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      const queryText = `
        SELECT
          user_id,
          world_id,
          username,
          email,
          country_code,
          city,
          is_verified,
          is_active,
          is_banned,
          ban_reason,
          created_at,
          last_active_at
        FROM users
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      params.push(limitValue, offset);

      const result = await dailyAnthemModel.customQuery(queryText, params);

      // Get total count
      const countQuery = `SELECT COUNT(*) FROM users ${whereClause}`;
      const countResult = await dailyAnthemModel.customQuery(countQuery, params.slice(0, -2));
      const totalCount = parseInt(countResult[0].count);

      return {
        users: result,
        pagination: {
          page,
          limit,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limit)
        }
      };

    } catch (error) {
      console.error('USER_SERVICE: Error searching users:', error);
      throw error;
    }
  }

  /**
   * Get user activity summary
   * @param {number} days - Number of days to look back
   * @returns {Promise<Object>} Activity summary
   */
  async getUserActivitySummary(days = 30) {
    const queryText = `
      SELECT
        COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '${days} days' THEN 1 END) as new_users,
        COUNT(CASE WHEN last_active_at >= CURRENT_DATE - INTERVAL '1 day' THEN 1 END) as active_today,
        COUNT(CASE WHEN last_active_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as active_week,
        COUNT(CASE WHEN is_banned = true THEN 1 END) as banned_users,
        AVG(EXTRACT(EPOCH FROM (last_active_at - created_at)) / 86400) as avg_account_age_days
      FROM users
      WHERE is_active = true
    `;

    const result = await dailyAnthemModel.customQuery(queryText);
    return result[0];
  }

  /**
   * Log admin action
   * @param {string} adminId - Admin user ID
   * @param {string} action - Action performed
   * @param {string} entityId - Entity affected
   * @param {Object} details - Action details
   */
  async logAdminAction(adminId, action, entityId, details = {}) {
    try {
      const logEntry = {
        user_id: adminId,
        action,
        entity_type: 'user',
        entity_id: entityId,
        new_values: details,
        created_at: new Date()
      };

      await dailyAnthemModel.customQuery(`
        INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_values, created_at)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        logEntry.user_id,
        logEntry.action,
        logEntry.entity_type,
        logEntry.entity_id,
        JSON.stringify(logEntry.new_values),
        logEntry.created_at
      ]);

    } catch (error) {
      console.error('USER_SERVICE: Error logging admin action:', error);
      // Don't throw - logging failure shouldn't break the main operation
    }
  }

  /**
   * Bulk user operations
   * @param {Array} userIds - Array of user IDs
   * @param {string} operation - Operation to perform ('ban', 'unban', 'activate', 'deactivate')
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Operation results
   */
  async bulkUserOperation(userIds, operation, options = {}) {
    try {
      console.log(`USER_SERVICE: Performing bulk ${operation} on ${userIds.length} users`);

      const results = {
        successful: [],
        failed: [],
        total: userIds.length
      };

      for (const userId of userIds) {
        try {
          let result;
          switch (operation) {
            case 'ban':
              result = await this.banUser(userId, options.reason || 'Bulk ban', options.adminId);
              break;
            case 'unban':
              result = await this.unbanUser(userId, options.adminId);
              break;
            case 'activate':
              result = await userModel.update(userId, { is_active: true, updated_at: new Date() });
              break;
            case 'deactivate':
              result = await userModel.update(userId, { is_active: false, updated_at: new Date() });
              break;
            default:
              throw new Error(`Unknown operation: ${operation}`);
          }

          results.successful.push({ userId, result });
        } catch (error) {
          results.failed.push({ userId, error: error.message });
        }
      }

      console.log(`USER_SERVICE: Bulk ${operation} completed. Success: ${results.successful.length}, Failed: ${results.failed.length}`);

      return results;

    } catch (error) {
      console.error('USER_SERVICE: Error in bulk operation:', error);
      throw error;
    }
  }
}

// Create and export user service instance
export const userService = new UserService();

export default userService;