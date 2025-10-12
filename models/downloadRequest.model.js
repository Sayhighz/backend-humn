import { query } from '../config/database.config.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * DownloadRequest Model
 * Handles database operations for download requests
 */
export class DownloadRequest {
  /**
   * Create a new download request
   * @param {Object} data - Request data
   * @param {string} data.userId - User ID (optional)
   * @param {string} data.email - Requester email
   * @param {string} data.anthemId - Anthem ID
   * @param {string} data.purpose - Purpose of download
   * @param {string} data.projectDescription - Project description
   * @returns {Object} Created request
   */
  static async create(data) {
    const sql = `
      INSERT INTO download_requests (
        user_id, email, anthem_id, purpose, project_description
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;

    const values = [
      data.userId || null,
      data.email,
      data.anthemId,
      data.purpose,
      data.projectDescription || null
    ];

    const result = await query(sql, values);
    return result.rows[0];
  }

  /**
   * Find request by ID
   * @param {string} requestId - Request ID
   * @returns {Object|null} Request data or null
   */
  static async findById(requestId) {
    const sql = `
      SELECT
        dr.*,
        da.anthem_date,
        da.status as anthem_status,
        da.anthem_audio_url
      FROM download_requests dr
      LEFT JOIN daily_anthems da ON dr.anthem_id = da.anthem_id
      WHERE dr.request_id = $1
    `;

    const result = await query(sql, [requestId]);
    return result.rows[0] || null;
  }

  /**
   * Update request status and download URL
   * @param {string} requestId - Request ID
   * @param {Object} updates - Updates to apply
   * @returns {Object} Updated request
   */
  static async update(requestId, updates) {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    Object.keys(updates).forEach(key => {
      fields.push(`${key} = $${paramIndex}`);
      values.push(updates[key]);
      paramIndex++;
    });

    values.push(requestId);

    const sql = `
      UPDATE download_requests
      SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE request_id = $${paramIndex}
      RETURNING *
    `;

    const result = await query(sql, values);
    return result.rows[0];
  }

  /**
   * Get all requests with pagination
   * @param {Object} options - Query options
   * @param {string} options.status - Filter by status
   * @param {number} options.limit - Limit results
   * @param {number} options.offset - Offset for pagination
   * @returns {Array} Array of requests
   */
  static async findAll(options = {}) {
    let whereClause = '';
    const values = [];
    let paramIndex = 1;

    if (options.status) {
      whereClause = `WHERE status = $${paramIndex}`;
      values.push(options.status);
      paramIndex++;
    }

    const query = `
      SELECT
        dr.*,
        da.anthem_date,
        da.status as anthem_status
      FROM download_requests dr
      LEFT JOIN daily_anthems da ON dr.anthem_id = da.anthem_id
      ${whereClause}
      ORDER BY dr.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    values.push(options.limit || 50);
    values.push(options.offset || 0);

    const result = await pool.query(query, values);
    return result.rows;
  }

  /**
   * Check if anthem exists and is available for download
   * @param {string} anthemId - Anthem ID
   * @returns {Object|null} Anthem data or null
   */
  static async checkAnthemAvailability(anthemId) {
    const sql = `
      SELECT anthem_id, status, anthem_audio_url
      FROM daily_anthems
      WHERE anthem_id = $1 AND status = 'completed'
    `;

    const result = await query(sql, [anthemId]);
    return result.rows[0] || null;
  }
}