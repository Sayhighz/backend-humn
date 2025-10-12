import { dbUtils } from './index.js';

export class DeviceTokenModel {
  constructor() {
    this.table = 'device_tokens';
  }

  /**
   * Upsert device token by unique device_token
   * @param {{ userId: string, deviceToken: string, platform: 'ios'|'android'|'web' }} params
   * @returns {Promise<object>}
   */
  async upsertToken({ userId, deviceToken, platform }) {
    const sql = `
      INSERT INTO ${this.table} (
        user_id, device_token, platform, is_active, last_used_at
      ) VALUES ($1, $2, $3, true, CURRENT_TIMESTAMP)
      ON CONFLICT (device_token) DO UPDATE SET
        user_id = EXCLUDED.user_id,
        platform = EXCLUDED.platform,
        is_active = true,
        last_used_at = CURRENT_TIMESTAMP
      RETURNING 
        token_id,
        user_id,
        platform,
        is_active,
        created_at,
        last_used_at
    `;
    const result = await dbUtils.query(sql, [userId, deviceToken, platform]);
    return result.rows?.[0] || null;
  }
}

export const deviceTokenModel = new DeviceTokenModel();
export default deviceTokenModel;