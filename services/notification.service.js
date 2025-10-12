import { notificationModel } from '../models/notification.model.js';
import { settingsModel } from '../models/settings.model.js';
import { deviceTokenModel } from '../models/deviceToken.model.js';
import {
  buildPagination,
  normalizeBooleanQuery,
  mapNotificationRow,
  mapPreferencesRow,
  PAGE_SIZE_DEFAULT,
  isValidPlatform
} from '../utils/transform.js';

class NotificationService {
  /**
   * Get notifications for a user with pagination and optional unread filter
   * @param {string} userId
   * @param {{ page?: number|string, unread?: boolean|string }} query
   * @returns {Promise<{ notifications: any[], unreadCount: number, page: number, pageSize: number }>}
   */
  async getNotifications(userId, query = {}) {
    if (!userId) throw new Error('UNAUTHORIZED');

    const unreadFlag = normalizeBooleanQuery(query.unread, false);
    const { page, limit } = buildPagination(query.page, PAGE_SIZE_DEFAULT);

    const rows = await notificationModel.listByUser(userId, {
      page,
      limit,
      unread: unreadFlag
    });

    const unreadCount = await notificationModel.countUnread(userId);
    const notifications = (rows || []).map(mapNotificationRow);

    return {
      notifications,
      unreadCount,
      page,
      pageSize: limit
    };
  }

  /**
   * Mark a notification as read (id must belong to user)
   * @param {string} userId
   * @param {string} notificationId
   * @returns {Promise<{ success: boolean }>}
   */
  async markNotificationRead(userId, notificationId) {
    if (!userId) throw new Error('UNAUTHORIZED');
    if (!notificationId) throw new Error('VALIDATION_ERROR');

    const updated = await notificationModel.markRead(userId, notificationId);
    return { success: !!updated };
  }

  /**
   * Mark all notifications as read for a user
   * @param {string} userId
   * @returns {Promise<{ success: boolean }>}
   */
  async markAllNotificationsRead(userId) {
    if (!userId) throw new Error('UNAUTHORIZED');

    await notificationModel.markAllRead(userId);
    return { success: true };
  }

  /**
   * Update notification preferences
   * @param {string} userId
   * @param {{ anthemReady: boolean, streakReminder: boolean, weeklyReport: boolean }} body
   * @returns {Promise<{ preferences: { anthemReady: boolean, streakReminder: boolean, weeklyReport: boolean } }>}
   */
  async updateNotificationPreferences(userId, body) {
    if (!userId) throw new Error('UNAUTHORIZED');
    if (!body || typeof body !== 'object') throw new Error('VALIDATION_ERROR');

    const {
      anthemReady = true,
      streakReminder = true,
      weeklyReport = false
    } = body;

    const row = await settingsModel.updatePreferences(userId, {
      anthemReady: !!anthemReady,
      streakReminder: !!streakReminder,
      weeklyReport: !!weeklyReport
    });

    const preferences = mapPreferencesRow(row);
    return { preferences };
  }

  /**
   * Register (upsert) a device token for push notifications
   * @param {string} userId
   * @param {{ deviceToken: string, platform: 'ios'|'android'|'web' }} body
   * @returns {Promise<{ success: boolean }>}
   */
  async registerDevice(userId, body) {
    if (!userId) throw new Error('UNAUTHORIZED');
    if (!body || typeof body !== 'object') throw new Error('VALIDATION_ERROR');

    const { deviceToken, platform } = body;
    if (!deviceToken || typeof deviceToken !== 'string' || deviceToken.trim() === '') {
      throw new Error('VALIDATION_ERROR');
    }
    const pf = String(platform || '').toLowerCase();
    if (!isValidPlatform(pf)) {
      throw new Error('INVALID_PLATFORM');
    }

    await deviceTokenModel.upsertToken({
      userId,
      deviceToken: deviceToken.trim(),
      platform: pf
    });

    return { success: true };
  }
}

export const notificationService = new NotificationService();
export default notificationService;