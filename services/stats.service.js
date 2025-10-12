import { dailyAnthemModel } from '../models/dailyAnthem.model.js';
import { userModel } from '../models/user.model.js';

export class StatsService {
  /**
   * Get admin dashboard overview statistics
   * @returns {Promise<Object>} Overview statistics
   */
  async getOverviewStats() {
    try {
      console.log('STATS_SERVICE: Getting overview statistics');

      // Get user statistics
      const userStats = await this.getUserStats();

      // Get anthem statistics
      const anthemStats = await this.getAnthemStats();

      // Get storage statistics
      const storageStats = await this.getStorageStats();

      // Get error statistics
      const errorStats = await this.getErrorStats();

      return {
        users: userStats,
        anthems: anthemStats,
        storage: storageStats,
        errors: errorStats,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('STATS_SERVICE: Error getting overview stats:', error);
      throw error;
    }
  }

  /**
   * Get user-related statistics
   * @returns {Promise<Object>} User statistics
   */
  async getUserStats() {
    const queryText = `
      SELECT
        COUNT(*) as total_users,
        COUNT(CASE WHEN is_active = true THEN 1 END) as active_users,
        COUNT(CASE WHEN is_verified = true THEN 1 END) as verified_users,
        COUNT(CASE WHEN is_banned = true THEN 1 END) as banned_users,
        COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as new_users_week,
        COUNT(CASE WHEN last_active_at >= CURRENT_DATE - INTERVAL '24 hours' THEN 1 END) as active_today
      FROM users
    `;

    const result = await dailyAnthemModel.customQuery(queryText);
    return result[0];
  }

  /**
   * Get anthem-related statistics
   * @returns {Promise<Object>} Anthem statistics
   */
  async getAnthemStats() {
    const queryText = `
      SELECT
        COUNT(*) as total_anthems,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_anthems,
        COUNT(CASE WHEN status = 'processing' THEN 1 END) as processing_anthems,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_anthems,
        COUNT(CASE WHEN anthem_date = CURRENT_DATE THEN 1 END) as today_anthems,
        SUM(total_voices) as total_voices_all_time,
        SUM(total_countries) as total_countries_all_time,
        AVG(total_voices) as avg_voices_per_anthem,
        MAX(total_voices) as max_voices_in_anthem
      FROM daily_anthems
    `;

    const result = await dailyAnthemModel.customQuery(queryText);
    return result[0];
  }

  /**
   * Get storage statistics
   * @returns {Promise<Object>} Storage statistics
   */
  async getStorageStats() {
    // Get voice contributions storage
    const voiceQuery = `
      SELECT
        COUNT(*) as total_voice_contributions,
        SUM(file_size_bytes) as total_voice_storage_bytes,
        COUNT(CASE WHEN audio_url IS NOT NULL THEN 1 END) as contributions_with_audio
      FROM voice_contributions
    `;

    const voiceResult = await dailyAnthemModel.customQuery(voiceQuery);

    // Get anthem storage
    const anthemQuery = `
      SELECT
        COUNT(DISTINCT anthem_id) as total_anthems_with_audio,
        SUM(file_size_bytes) as total_anthem_storage_bytes,
        COUNT(CASE WHEN anthem_audio_url IS NOT NULL THEN 1 END) as anthems_with_audio
      FROM daily_anthems
    `;

    const anthemResult = await dailyAnthemModel.customQuery(anthemQuery);

    const stats = {
      ...voiceResult[0],
      ...anthemResult[0]
    };

    // Convert bytes to MB/GB for readability
    const totalStorageBytes = (stats.total_voice_storage_bytes || 0) + (stats.total_anthem_storage_bytes || 0);
    const totalStorageMB = Math.round(totalStorageBytes / (1024 * 1024) * 100) / 100;
    const totalStorageGB = Math.round(totalStorageBytes / (1024 * 1024 * 1024) * 100) / 100;

    return {
      ...stats,
      total_storage_mb: totalStorageMB,
      total_storage_gb: totalStorageGB,
      total_storage_bytes: totalStorageBytes
    };
  }

  /**
   * Get error statistics
   * @returns {Promise<Object>} Error statistics
   */
  async getErrorStats() {
    // Count failed anthems
    const failedAnthemsQuery = `
      SELECT COUNT(*) as failed_anthems_count
      FROM daily_anthems
      WHERE status = 'failed'
    `;

    const failedAnthemsResult = await dailyAnthemModel.customQuery(failedAnthemsQuery);

    // Count failed contributions
    const failedContributionsQuery = `
      SELECT COUNT(*) as failed_contributions_count
      FROM voice_contributions
      WHERE status = 'failed'
    `;

    const failedContributionsResult = await dailyAnthemModel.customQuery(failedContributionsQuery);

    // Get recent errors (last 24 hours)
    const recentErrorsQuery = `
      SELECT COUNT(*) as recent_errors_count
      FROM audit_logs
      WHERE action = 'error'
        AND created_at >= CURRENT_DATE - INTERVAL '24 hours'
    `;

    const recentErrorsResult = await dailyAnthemModel.customQuery(recentErrorsQuery);

    return {
      failed_anthems: failedAnthemsResult[0].failed_anthems_count || 0,
      failed_contributions: failedContributionsResult[0].failed_contributions_count || 0,
      recent_errors_24h: recentErrorsResult[0].recent_errors_count || 0
    };
  }

  /**
   * Get detailed user statistics
   * @returns {Promise<Object>} Detailed user stats
   */
  async getDetailedUserStats() {
    const queryText = `
      SELECT
        country_code,
        COUNT(*) as user_count,
        COUNT(CASE WHEN is_active = true THEN 1 END) as active_users,
        COUNT(CASE WHEN is_verified = true THEN 1 END) as verified_users,
        AVG(EXTRACT(EPOCH FROM (last_active_at - created_at)) / 86400) as avg_account_age_days
      FROM users
      GROUP BY country_code
      ORDER BY user_count DESC
      LIMIT 20
    `;

    const result = await dailyAnthemModel.customQuery(queryText);
    return result;
  }

  /**
   * Get contribution statistics by country
   * @returns {Promise<Object>} Contribution stats by country
   */
  async getContributionStatsByCountry() {
    const queryText = `
      SELECT
        vc.country_code,
        cr.country_name,
        cr.region,
        COUNT(vc.contribution_id) as total_contributions,
        COUNT(DISTINCT vc.user_id) as unique_contributors,
        AVG(vc.duration_ms) as avg_duration_ms,
        MAX(vc.recorded_at) as last_contribution_at
      FROM voice_contributions vc
      LEFT JOIN countries_reference cr ON vc.country_code = cr.country_code
      GROUP BY vc.country_code, cr.country_name, cr.region
      ORDER BY total_contributions DESC
      LIMIT 20
    `;

    const result = await dailyAnthemModel.customQuery(queryText);
    return result;
  }

  /**
   * Get system performance metrics
   * @returns {Promise<Object>} Performance metrics
   */
  async getSystemPerformance() {
    // Get database size
    const dbSizeQuery = `
      SELECT
        pg_size_pretty(pg_database_size(current_database())) as db_size,
        pg_database_size(current_database()) as db_size_bytes
    `;

    const dbSizeResult = await dailyAnthemModel.customQuery(dbSizeQuery);

    // Get table row counts
    const tableCountsQuery = `
      SELECT
        schemaname,
        tablename,
        n_tup_ins as inserts,
        n_tup_upd as updates,
        n_tup_del as deletes,
        n_live_tup as live_rows,
        n_dead_tup as dead_rows
      FROM pg_stat_user_tables
      WHERE schemaname = 'public'
      ORDER BY n_live_tup DESC
    `;

    const tableCountsResult = await dailyAnthemModel.customQuery(tableCountsQuery);

    return {
      database_size: dbSizeResult[0],
      table_statistics: tableCountsResult
    };
  }

  /**
   * Get time-series data for charts
   * @param {string} period - '7d', '30d', '90d'
   * @returns {Promise<Object>} Time-series data
   */
  async getTimeSeriesData(period = '30d') {
    const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;

    const contributionsQuery = `
      SELECT
        DATE(recorded_at AT TIME ZONE 'UTC') as date,
        COUNT(*) as contributions_count,
        COUNT(DISTINCT user_id) as unique_users,
        COUNT(DISTINCT country_code) as countries_count
      FROM voice_contributions
      WHERE recorded_at >= CURRENT_DATE - INTERVAL '${days} days'
      GROUP BY DATE(recorded_at AT TIME ZONE 'UTC')
      ORDER BY date
    `;

    const contributionsResult = await dailyAnthemModel.customQuery(contributionsQuery);

    const anthemsQuery = `
      SELECT
        anthem_date as date,
        total_voices,
        total_countries,
        status
      FROM daily_anthems
      WHERE anthem_date >= CURRENT_DATE - INTERVAL '${days} days'
      ORDER BY anthem_date
    `;

    const anthemsResult = await dailyAnthemModel.customQuery(anthemsQuery);

    return {
      contributions: contributionsResult,
      anthems: anthemsResult,
      period: period
    };
  }
}

// Create and export stats service instance
export const statsService = new StatsService();

export default statsService;