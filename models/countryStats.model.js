import { BaseModel, dbUtils } from './index.js';

export class CountryStats extends BaseModel {
  constructor() {
    super('country_stats');
  }

  /**
   * Get or create country stats record
   */
  async getOrCreate(countryCode) {
    let stats = await this.findOne('country_code = $1', [countryCode]);

    if (!stats) {
      stats = await this.create({
        country_code: countryCode,
        total_users: 0,
        total_contributions: 0,
        last_updated: new Date()
      });
    }

    return stats;
  }

  /**
   * Update country statistics
   */
  async updateStats(countryCode, statsData) {
    const updateData = {
      ...statsData,
      last_updated: new Date()
    };

    return await this.updateByCondition(
      updateData,
      'country_code = $1',
      [countryCode]
    );
  }

  /**
   * Get all country stats ordered by contribution count
   */
  async getAllOrderedByContributions() {
    const queryText = `
      SELECT * FROM ${this.tableName}
      ORDER BY total_contributions DESC, total_users DESC
    `;

    const result = await dbUtils.query(queryText);
    return result.rows;
  }

  /**
   * Increment contribution count for a country
   */
  async incrementContributions(countryCode) {
    const queryText = `
      UPDATE ${this.tableName}
      SET total_contributions = total_contributions + 1, last_updated = CURRENT_TIMESTAMP
      WHERE country_code = $1
      RETURNING *
    `;

    const result = await dbUtils.query(queryText, [countryCode]);
    return result.rows[0] || null;
  }

  /**
   * Increment user count for a country
   */
  async incrementUsers(countryCode) {
    const queryText = `
      UPDATE ${this.tableName}
      SET total_users = total_users + 1, last_updated = CURRENT_TIMESTAMP
      WHERE country_code = $1
      RETURNING *
    `;

    const result = await dbUtils.query(queryText, [countryCode]);
    return result.rows[0] || null;
  }

  /**
   * Get country stats with contribution trends
   */
  async getStatsWithTrends(countryCode, days = 30) {
    const stats = await this.findOne('country_code = $1', [countryCode]);

    if (!stats) return null;

    // Get daily contribution counts for the last N days
    const trendsQuery = `
      SELECT
        DATE(c.created_at) as date,
        COUNT(*) as count
      FROM contributions c
      JOIN users u ON c.user_id = u.user_id
      WHERE u.country_code = $1
        AND c.is_approved = true
        AND c.created_at >= CURRENT_DATE - INTERVAL '${days} days'
      GROUP BY DATE(c.created_at)
      ORDER BY date DESC
    `;

    const trendsResult = await dbUtils.query(trendsQuery, [countryCode]);

    return {
      ...stats,
      trends: trendsResult.rows
    };
  }
}

// Create and export country stats model instance
export const countryStatsModel = new CountryStats();

export default countryStatsModel;