import { dbUtils } from './index.js';

export class NotificationModel {
  constructor() {
    this.table = 'notifications';
  }

  /**
   * List notifications for a user with pagination and optional unread filter
   * @param {string} userId - UUID from users.user_id
   * @param {{ page?: number, limit?: number, unread?: boolean }} options
   * @returns {Promise<Array>}
   */
  async listByUser(userId, options = {}) {
    const page = Number.isFinite(+options.page) && +options.page > 0 ? Math.floor(+options.page) : 1;
    const limit = Number.isFinite(+options.limit) && +options.limit > 0 ? Math.floor(+options.limit) : 20;
    const offset = (page - 1) * limit;
    const unread = Boolean(options.unread);

    const params = [userId];
    let idx = 2;

    let where = 'user_id = $1';
    if (unread) {
      where += ` AND is_read = false`;
    }

    const sql = `
      SELECT 
        notification_id,
        user_id,
        type,
        title,
        message,
        related_anthem_id,
        related_user_id,
        is_read,
        read_at,
        is_sent,
        sent_at,
        delivery_method,
        created_at,
        expires_at,
        metadata
      FROM ${this.table}
      WHERE ${where}
      ORDER BY created_at DESC
      LIMIT $${idx++} OFFSET $${idx++}
    `;

    params.push(limit, offset);
    const result = await dbUtils.query(sql, params);
    return result.rows;
  }

  /**
   * Count unread notifications for a user
   * @param {string} userId
   * @returns {Promise<number>}
   */
  async countUnread(userId) {
    const sql = `
      SELECT COUNT(*)::int AS cnt
      FROM ${this.table}
      WHERE user_id = $1 AND is_read = false
    `;
    const result = await dbUtils.query(sql, [userId]);
    return result.rows?.[0]?.cnt ?? 0;
  }

  /**
   * Mark a single notification as read
   * @param {string} userId
   * @param {string} notificationId
   * @returns {Promise<boolean>} true if updated
   */
  async markRead(userId, notificationId) {
    const sql = `
      UPDATE ${this.table}
      SET is_read = true, read_at = CURRENT_TIMESTAMP
      WHERE notification_id = $1 AND user_id = $2 AND is_read = false
      RETURNING notification_id
    `;
    const result = await dbUtils.query(sql, [notificationId, userId]);
    return result.rowCount > 0;
  }

  /**
   * Mark all notifications as read for a user
   * @param {string} userId
   * @returns {Promise<number>} number of rows updated
   */
  async markAllRead(userId) {
    const sql = `
      UPDATE ${this.table}
      SET is_read = true, read_at = CURRENT_TIMESTAMP
      WHERE user_id = $1 AND is_read = false
    `;
    const result = await dbUtils.query(sql, [userId]);
    return result.rowCount || 0;
  }
}

export const notificationModel = new NotificationModel();

export default notificationModel;