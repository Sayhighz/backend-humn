import { BaseModel, dbUtils } from './index.js';

export class Anthem extends BaseModel {
  constructor() {
    super('anthems');
  }

  // Get today's anthem
  async getTodayAnthem() {
    const queryText = `
      SELECT * FROM ${this.tableName}
      WHERE DATE(date) = CURRENT_DATE
      ORDER BY created_at DESC
      LIMIT 1
    `;
    
    const result = await dbUtils.query(queryText);
    return result.rows[0] || null;
  }

  // Get anthem by date
  async getAnthemByDate(date) {
    const queryText = `
      SELECT * FROM ${this.tableName}
      WHERE DATE(date) = $1
      ORDER BY created_at DESC
      LIMIT 1
    `;
    
    const result = await dbUtils.query(queryText, [date]);
    return result.rows[0] || null;
  }

  // Get recent anthems with pagination
  async getRecentAnthems(page = 1, limit = 10) {
    const { limit: limitValue, offset } = dbUtils.buildPagination(page, limit);
    
    const queryText = `
      SELECT 
        a.*,
        COUNT(c.id) as contribution_count,
        COUNT(CASE WHEN c.is_approved = true THEN 1 END) as approved_count
      FROM ${this.tableName} a
      LEFT JOIN contributions c ON a.id = c.anthem_id
      WHERE a.date <= CURRENT_DATE
      GROUP BY a.id
      ORDER BY a.date DESC
      LIMIT $1 OFFSET $2
    `;
    
    const result = await dbUtils.query(queryText, [limitValue, offset]);
    return result.rows;
  }

  // Create new anthem
  async createAnthem(anthemData) {
    const anthemToCreate = {
      ...anthemData,
      created_at: new Date(),
      updated_at: new Date()
    };

    return await this.create(anthemToCreate);
  }

  // Update anthem with generated audio URL
  async updateAnthemAudio(anthemId, audioUrl, generatedBy = null) {
    const queryText = `
      UPDATE ${this.tableName}
      SET audio_url = $2, generated_by = $3, generated_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;
    
    const result = await dbUtils.query(queryText, [anthemId, audioUrl, generatedBy]);
    return result.rows[0] || null;
  }

  // Get anthem with contributions
  async getAnthemWithContributions(anthemId) {
    const queryText = `
      SELECT 
        a.*,
        COUNT(c.id) as total_contributions,
        COUNT(CASE WHEN c.is_approved = true THEN 1 END) as approved_contributions,
        COUNT(CASE WHEN c.is_approved = false THEN 1 END) as rejected_contributions,
        COUNT(CASE WHEN c.is_approved IS NULL THEN 1 END) as pending_contributions,
        COUNT(DISTINCT c.user_id) as unique_contributors
      FROM ${this.tableName} a
      LEFT JOIN contributions c ON a.id = c.anthem_id
      WHERE a.id = $1
      GROUP BY a.id
    `;
    
    const result = await dbUtils.query(queryText, [anthemId]);
    return result.rows[0] || null;
  }

  // Get anthem statistics
  async getAnthemStats(timeFrame = '30 days') {
    const queryText = `
      SELECT 
        COUNT(*) as total_anthems,
        COUNT(CASE WHEN audio_url IS NOT NULL THEN 1 END) as generated_anthems,
        COUNT(CASE WHEN date = CURRENT_DATE THEN 1 END) as today_anthem,
        AVG(CASE WHEN audio_url IS NOT NULL THEN 
          EXTRACT(EPOCH FROM (generated_at - created_at)) / 60 
        END) as avg_generation_time_minutes
      FROM ${this.tableName}
      WHERE created_at >= CURRENT_DATE - INTERVAL '${timeFrame}'
    `;
    
    const result = await dbUtils.query(queryText);
    return result.rows[0];
  }

  // Get anthems by date range
  async getAnthemByDateRange(startDate, endDate) {
    const queryText = `
      SELECT 
        a.*,
        COUNT(c.id) as contribution_count
      FROM ${this.tableName} a
      LEFT JOIN contributions c ON a.id = c.anthem_id AND c.is_approved = true
      WHERE a.date BETWEEN $1 AND $2
      GROUP BY a.id
      ORDER BY a.date DESC
    `;
    
    const result = await dbUtils.query(queryText, [startDate, endDate]);
    return result.rows;
  }

  // Check if anthem exists for date
  async anthemExistsForDate(date) {
    const queryText = `
      SELECT 1 FROM ${this.tableName}
      WHERE DATE(date) = $1
      LIMIT 1
    `;
    
    const result = await dbUtils.query(queryText, [date]);
    return result.rows.length > 0;
  }

  // Get anthem contributions with user details
  async getAnthemContributions(anthemId, options = {}) {
    const { page = 1, limit = 50, approvedOnly = true } = options;
    const { limit: limitValue, offset } = dbUtils.buildPagination(page, limit);
    
    let whereClause = 'c.anthem_id = $1';
    const params = [anthemId];
    
    if (approvedOnly) {
      whereClause += ' AND c.is_approved = true';
    }
    
    const queryText = `
      SELECT 
        c.id,
        c.audio_url,
        c.duration,
        c.created_at,
        u.username,
        u.first_name,
        u.last_name,
        u.country,
        u.avatar_url
      FROM contributions c
      LEFT JOIN users u ON c.user_id = u.id
      WHERE ${whereClause}
      ORDER BY c.created_at ASC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;
    
    params.push(limitValue, offset);
    const result = await dbUtils.query(queryText, params);
    return result.rows;
  }

  // Update anthem status
  async updateAnthemStatus(anthemId, status) {
    return await this.update(anthemId, { 
      status,
      updated_at: new Date()
    });
  }
}

// Create and export anthem model instance
export const anthemModel = new Anthem();

export default anthemModel;