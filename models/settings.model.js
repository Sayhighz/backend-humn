import { dbUtils } from './index.js';

export class SettingsModel {
  constructor() {
    this.table = 'user_settings';
  }

  /**
   * Ensure a settings row exists then return preferences
   * @param {string} userId
   * @returns {Promise<object|null>}
   */
  async getOrCreate(userId) {
    // Ensure row exists
    await dbUtils.query(
      `INSERT INTO ${this.table} (user_id) VALUES ($1)
       ON CONFLICT (user_id) DO NOTHING`,
      [userId]
    );

    // Return current row
    const res = await dbUtils.query(
      `SELECT
         user_id,
         audio_quality,
         language,
         theme,
         auto_play,
         anthem_ready_notification,
         streak_reminder_notification,
         weekly_report_notification,
         show_profile,
         share_stats,
         show_country,
         allow_messaging,
         updated_at
       FROM ${this.table}
       WHERE user_id = $1
       LIMIT 1`,
      [userId]
    );

    return res.rows[0] || null;
  }

  /**
   * Update user settings (general settings)
   * @param {string} userId
   * @param {{ audioQuality: string, language: string, theme: string, autoPlay: boolean, notifications: object }} settings
   * @returns {Promise<object>}
   */
  async updateSettings(userId, settings) {
    const {
      audioQuality,
      language,
      theme,
      autoPlay,
      notifications
    } = settings;

    const res = await dbUtils.query(
      `INSERT INTO ${this.table} (
         user_id,
         audio_quality,
         language,
         theme,
         auto_play,
         anthem_ready_notification,
         streak_reminder_notification,
         weekly_report_notification
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (user_id) DO UPDATE SET
         audio_quality = EXCLUDED.audio_quality,
         language = EXCLUDED.language,
         theme = EXCLUDED.theme,
         auto_play = EXCLUDED.auto_play,
         anthem_ready_notification = EXCLUDED.anthem_ready_notification,
         streak_reminder_notification = EXCLUDED.streak_reminder_notification,
         weekly_report_notification = EXCLUDED.weekly_report_notification,
         updated_at = CURRENT_TIMESTAMP
       RETURNING
         user_id,
         audio_quality,
         language,
         theme,
         auto_play,
         anthem_ready_notification,
         streak_reminder_notification,
         weekly_report_notification,
         updated_at`,
      [userId, audioQuality, language, theme, autoPlay,
       notifications?.anthemReady, notifications?.streakReminder, notifications?.weeklyReport]
    );

    return res.rows[0];
  }

  /**
   * Update privacy settings
   * @param {string} userId
   * @param {{ showProfile: boolean, shareStats: boolean, showCountry: boolean, allowMessaging: boolean }} privacy
   * @returns {Promise<object>}
   */
  async updatePrivacySettings(userId, privacy) {
    const {
      showProfile,
      shareStats,
      showCountry,
      allowMessaging
    } = privacy;

    const res = await dbUtils.query(
      `INSERT INTO ${this.table} (
         user_id,
         show_profile,
         share_stats,
         show_country,
         allow_messaging
       ) VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id) DO UPDATE SET
         show_profile = EXCLUDED.show_profile,
         share_stats = EXCLUDED.share_stats,
         show_country = EXCLUDED.show_country,
         allow_messaging = EXCLUDED.allow_messaging,
         updated_at = CURRENT_TIMESTAMP
       RETURNING
         user_id,
         show_profile,
         share_stats,
         show_country,
         allow_messaging,
         updated_at`,
      [userId, showProfile, shareStats, showCountry, allowMessaging]
    );

    return res.rows[0];
  }

  /**
   * Get privacy settings
   * @param {string} userId
   * @returns {Promise<object|null>}
   */
  async getPrivacySettings(userId) {
    // Ensure row exists
    await dbUtils.query(
      `INSERT INTO ${this.table} (user_id) VALUES ($1)
       ON CONFLICT (user_id) DO NOTHING`,
      [userId]
    );

    const res = await dbUtils.query(
      `SELECT
         user_id,
         show_profile,
         share_stats,
         show_country,
         allow_messaging,
         updated_at
       FROM ${this.table}
       WHERE user_id = $1
       LIMIT 1`,
      [userId]
    );

    return res.rows[0] || null;
  }
}

export const settingsModel = new SettingsModel();
export default settingsModel;