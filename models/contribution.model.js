import { BaseModel, dbUtils } from './index.js';

export class Contribution extends BaseModel {
  constructor() {
    super('contributions');
  }

  // Get contributions by user ID
  async findByUserId(userId, options = {}) {
    const { page = 1, limit = 10 } = options;
    const { limit: limitValue, offset } = dbUtils.buildPagination(page, limit);
    
    const queryText = `
      SELECT c.*, a.title as anthem_title, a.date as anthem_date
      FROM ${this.tableName} c
      LEFT JOIN anthems a ON c.anthem_id = a.id
      WHERE c.user_id = $1
      ORDER BY c.created_at DESC
      LIMIT $2 OFFSET $3
    `;
    
    const result = await dbUtils.query(queryText, [userId, limitValue, offset]);
    return result.rows;
  }

  // Get contributions by anthem ID
  async findByAnthemId(anthemId, options = {}) {
    const { page = 1, limit = 10 } = options;
    const { limit: limitValue, offset } = dbUtils.buildPagination(page, limit);
    
    const queryText = `
      SELECT c.*, u.username, u.first_name, u.last_name, u.country
      FROM ${this.tableName} c
      LEFT JOIN users u ON c.user_id = u.id
      WHERE c.anthem_id = $1 AND c.is_approved = true
      ORDER BY c.created_at ASC
      LIMIT $2 OFFSET $3
    `;
    
    const result = await dbUtils.query(queryText, [anthemId, limitValue, offset]);
    return result.rows;
  }

  // Create new contribution
  async createContribution(contributionData) {
    const contributionToCreate = {
      ...contributionData,
      created_at: new Date(),
      updated_at: new Date()
    };

    return await this.create(contributionToCreate);
  }

  // Get pending contributions for admin review
  async getPendingContributions(page = 1, limit = 10) {
    const { limit: limitValue, offset } = dbUtils.buildPagination(page, limit);
    
    const queryText = `
      SELECT c.*, u.username, u.first_name, u.last_name, u.country
      FROM ${this.tableName} c
      LEFT JOIN users u ON c.user_id = u.id
      WHERE c.is_approved IS NULL
      ORDER BY c.created_at ASC
      LIMIT $1 OFFSET $2
    `;
    
    const result = await dbUtils.query(queryText, [limitValue, offset]);
    return result.rows;
  }

  // Approve contribution
  async approveContribution(contributionId, approvedBy = null) {
    const queryText = `
      UPDATE ${this.tableName}
      SET is_approved = true, approved_by = $2, approved_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;
    
    const result = await dbUtils.query(queryText, [contributionId, approvedBy]);
    return result.rows[0] || null;
  }

  // Reject contribution
  async rejectContribution(contributionId, rejectionReason, rejectedBy = null) {
    const queryText = `
      UPDATE ${this.tableName}
      SET is_approved = false, rejection_reason = $2, rejected_by = $3, rejected_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;
    
    const result = await dbUtils.query(queryText, [contributionId, rejectionReason, rejectedBy]);
    return result.rows[0] || null;
  }

  // Get contribution statistics
  async getContributionStats(userId = null) {
    let whereClause = '';
    const params = [];
    
    if (userId) {
      whereClause = 'WHERE c.user_id = $1';
      params.push(userId);
    }
    
    const queryText = `
      SELECT 
        COUNT(*) as total_contributions,
        COUNT(CASE WHEN c.is_approved = true THEN 1 END) as approved_contributions,
        COUNT(CASE WHEN c.is_approved = false THEN 1 END) as rejected_contributions,
        COUNT(CASE WHEN c.is_approved IS NULL THEN 1 END) as pending_contributions,
        COUNT(CASE WHEN c.created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as recent_contributions
      FROM ${this.tableName} c
      ${whereClause}
    `;
    
    const result = await dbUtils.query(queryText, params);
    return result.rows[0];
  }

  // Get daily contribution count for the last 30 days
  async getDailyContributionCount(days = 30) {
    const queryText = `
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as count
      FROM ${this.tableName}
      WHERE created_at >= CURRENT_DATE - INTERVAL '${days} days'
        AND is_approved = true
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `;
    
    const result = await dbUtils.query(queryText);
    return result.rows;
  }

  // Get top contributors
  async getTopContributors(limit = 10, timeFrame = '30 days') {
    const queryText = `
      SELECT 
        u.id,
        u.username,
        u.first_name,
        u.last_name,
        u.country,
        COUNT(c.id) as contribution_count
      FROM users u
      LEFT JOIN ${this.tableName} c ON u.id = c.user_id
        AND c.created_at >= CURRENT_DATE - INTERVAL '${timeFrame}'
        AND c.is_approved = true
      WHERE u.is_active = true
      GROUP BY u.id, u.username, u.first_name, u.last_name, u.country
      HAVING COUNT(c.id) > 0
      ORDER BY contribution_count DESC, u.created_at ASC
      LIMIT $1
    `;
    
    const result = await dbUtils.query(queryText, [limit]);
    return result.rows;
  }

  // Check if user has already contributed to today's anthem
  async hasUserContributedToday(userId, anthemId) {
    const queryText = `
      SELECT 1 FROM ${this.tableName}
      WHERE user_id = $1 AND anthem_id = $2
      LIMIT 1
    `;
    
    const result = await dbUtils.query(queryText, [userId, anthemId]);
    return result.rows.length > 0;
  }
}

// Create and export contribution model instance
export const contributionModel = new Contribution();

export default contributionModel;