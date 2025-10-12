import { successResponse, errorResponse, notFoundResponse, unauthorizedResponse } from '../utils/response.js';
import { notificationService } from '../services/notification.service.js';

/**
 * Notification Controller
 * Handles user notifications, preferences, and device registration
 */
export const notificationController = {
  /**
   * Get user notifications
   */
  async getNotifications(req, res) {
    try {
      const userId = req.user?.user_id;
      if (!userId) return unauthorizedResponse(res);

      const result = await notificationService.getNotifications(userId, req.query);
      return successResponse(res, result, 'Notifications fetched');
    } catch (err) {
      console.error('NOTIFICATION_CONTROLLER:getNotifications error', err);
      return errorResponse(res, 'Failed to fetch notifications', 500);
    }
  },

  /**
   * Mark notification as read
   */
  async markNotificationRead(req, res) {
    try {
      const userId = req.user?.user_id;
      if (!userId) return unauthorizedResponse(res);

      const { notificationId } = req.params;
      const result = await notificationService.markNotificationRead(userId, notificationId);

      if (!result.success) {
        return notFoundResponse(res, 'Notification not found');
      }

      return successResponse(res, { success: true }, 'Notification marked as read');
    } catch (err) {
      console.error('NOTIFICATION_CONTROLLER:markNotificationRead error', err);
      const msg = String(err?.message || '');
      if (msg === 'VALIDATION_ERROR') {
        return errorResponse(res, 'Invalid notification id', 400);
      }
      return errorResponse(res, 'Failed to mark notification as read', 500);
    }
  },

  /**
   * Mark all notifications as read
   */
  async markAllNotificationsRead(req, res) {
    try {
      const userId = req.user?.user_id;
      if (!userId) return unauthorizedResponse(res);

      await notificationService.markAllNotificationsRead(userId);
      return successResponse(res, { success: true }, 'All notifications marked as read');
    } catch (err) {
      console.error('NOTIFICATION_CONTROLLER:markAllNotificationsRead error', err);
      return errorResponse(res, 'Failed to mark all notifications as read', 500);
    }
  },

  /**
   * Update notification preferences
   */
  async updateNotificationPreferences(req, res) {
    try {
      const userId = req.user?.user_id;
      if (!userId) return unauthorizedResponse(res);

      const result = await notificationService.updateNotificationPreferences(userId, req.body);
      return successResponse(res, result, 'Notification preferences updated');
    } catch (err) {
      console.error('NOTIFICATION_CONTROLLER:updateNotificationPreferences error', err);
      const msg = String(err?.message || '');
      if (msg === 'VALIDATION_ERROR') {
        return errorResponse(res, 'Invalid preferences payload', 400);
      }
      return errorResponse(res, 'Failed to update notification preferences', 500);
    }
  },

  /**
   * Register device for push notifications
   */
  async registerDevice(req, res) {
    try {
      const userId = req.user?.user_id;
      if (!userId) return unauthorizedResponse(res);

      const result = await notificationService.registerDevice(userId, req.body);
      return successResponse(res, result, 'Device registered');
    } catch (err) {
      console.error('NOTIFICATION_CONTROLLER:registerDevice error', err);
      const msg = String(err?.message || '');
      if (msg === 'VALIDATION_ERROR') {
        return errorResponse(res, 'Invalid device registration payload', 400);
      }
      if (msg === 'INVALID_PLATFORM') {
        return errorResponse(res, 'Platform must be one of ios, android, web', 400);
      }
      return errorResponse(res, 'Failed to register device', 500);
    }
  }
};