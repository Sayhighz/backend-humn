import { BaseModel, dbUtils } from './index.js';

export class DailyAnthem extends BaseModel {
  constructor() {
    super('daily_anthems');
  }

  // Get today's anthem
  async getTodayAnthem() {
    const queryText = `
      SELECT * FROM ${this.tableName}
      WHERE anthem_date = CURRENT_DATE
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
      WHERE anthem_date = $1
      ORDER BY created_at DESC
      LIMIT 1
    `;

    const result = await dbUtils.query(queryText, [date]);
    return result.rows[0] || null;
  }

  // Get anthem by ID
  async getAnthemById(anthemId) {
    const queryText = `
      SELECT * FROM ${this.tableName}
      WHERE anthem_id = $1
    `;

    const result = await dbUtils.query(queryText, [anthemId]);
    return result.rows[0] || null;
  }

  // Get recent anthems with pagination
  async getRecentAnthems(page = 1, limit = 10) {
    const { limit: limitValue, offset } = dbUtils.buildPagination(page, limit);

    const queryText = `
      SELECT *
      FROM ${this.tableName}
      WHERE anthem_date <= CURRENT_DATE
      ORDER BY anthem_date DESC
      LIMIT $1 OFFSET $2
    `;

    const result = await dbUtils.query(queryText, [limitValue, offset]);
    return result.rows;
  }

  // Create new anthem
  async createAnthem(anthemData) {
    const anthemToCreate = {
      anthem_id: anthemData.anthem_id,
      anthem_date: anthemData.anthem_date,
      status: anthemData.status || 'collecting',
      total_voices: 0,
      total_countries: 0,
      total_duration_ms: 0,
      created_at: new Date(),
      updated_at: new Date(),
      ...anthemData
    };

    return await this.create(anthemToCreate);
  }

  // Update anthem status
  async updateStatus(anthemId, status, additionalData = {}) {
    const updateData = {
      status,
      updated_at: new Date(),
      ...additionalData
    };

    const queryText = `
      UPDATE ${this.tableName}
      SET ${Object.keys(updateData).map((key, index) => `${key} = $${index + 2}`).join(', ')}
      WHERE anthem_id = $1
      RETURNING *
    `;

    const values = [anthemId, ...Object.values(updateData)];
    const result = await dbUtils.query(queryText, values);
    return result.rows[0] || null;
  }

  // Update anthem statistics
  async updateStats(anthemId) {
    const queryText = `
      UPDATE ${this.tableName}
      SET
        total_voices = (
          SELECT COUNT(*)
          FROM voice_contributions
          WHERE anthem_id = $1
        ),
        total_countries = (
          SELECT COUNT(DISTINCT country_code)
          FROM voice_contributions
          WHERE anthem_id = $1
        ),
        total_duration_ms = (
          SELECT COALESCE(SUM(duration_ms), 0)
          FROM voice_contributions
          WHERE anthem_id = $1
        ),
        updated_at = CURRENT_TIMESTAMP
      WHERE anthem_id = $1
      RETURNING *
    `;

    const result = await dbUtils.query(queryText, [anthemId]);
    return result.rows[0] || null;
  }

  // Check if anthem exists for date
  async anthemExistsForDate(date) {
    const queryText = `
      SELECT 1 FROM ${this.tableName}
      WHERE anthem_date = $1
      LIMIT 1
    `;

    const result = await dbUtils.query(queryText, [date]);
    return result.rows.length > 0;
  }

  // Get anthem statistics
  async getAnthemStats(timeFrame = '30 days') {
    const queryText = `
      SELECT
        COUNT(*) as total_anthems,
        COUNT(CASE WHEN anthem_audio_url IS NOT NULL THEN 1 END) as generated_anthems,
        COUNT(CASE WHEN anthem_date = CURRENT_DATE THEN 1 END) as today_anthem,
        AVG(CASE WHEN anthem_audio_url IS NOT NULL THEN
          EXTRACT(EPOCH FROM (generation_completed_at - generation_started_at)) / 60
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
      SELECT *
      FROM ${this.tableName}
      WHERE anthem_date BETWEEN $1 AND $2
      ORDER BY anthem_date DESC
    `;

    const result = await dbUtils.query(queryText, [startDate, endDate]);
    return result.rows;
  }

  // Get anthem with segments
  async getAnthemWithSegments(anthemId) {
    const queryText = `
      SELECT
        da.*,
        json_agg(
          json_build_object(
            'segment_id', asg.segment_id,
            'country_code', asg.country_code,
            'country_name', asg.country_name,
            'start_time_ms', asg.start_time_ms,
            'end_time_ms', asg.end_time_ms,
            'duration_ms', asg.duration_ms,
            'sequence_order', asg.sequence_order,
            'voice_count', asg.voice_count
          ) ORDER BY asg.sequence_order
        ) as segments
      FROM ${this.tableName} da
      LEFT JOIN anthem_segments asg ON da.anthem_id = asg.anthem_id
      WHERE da.anthem_id = $1
      GROUP BY da.anthem_id, da.anthem_date, da.anthem_audio_url, da.duration_seconds,
               da.file_size_bytes, da.audio_format, da.total_voices, da.total_countries,
               da.total_duration_ms, da.status, da.generation_started_at,
               da.generation_completed_at, da.ai_model, da.ai_parameters,
               da.created_at, da.updated_at, da.metadata
    `;

    const result = await dbUtils.query(queryText, [anthemId]);
    return result.rows[0] || null;
  }
}

// Create and export daily anthem model instance
export const dailyAnthemModel = new DailyAnthem();

export default dailyAnthemModel;