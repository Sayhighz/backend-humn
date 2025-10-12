import { successResponse, errorResponse } from '../utils/response.js';
import { settingsModel } from '../models/settings.model.js';

/**
 * Settings Controller
 * Handles user settings and privacy preferences
 */

export const settingsController = {
  /**
   * Get user settings
   * GET /api/v1/settings
   */
  async getSettings(req, res) {
    try {
      console.log('SETTINGS_CONTROLLER: GET /api/v1/settings');
      const userId = req.user.user_id;

      const settings = await settingsModel.getOrCreate(userId);

      if (!settings) {
        return errorResponse(res, 'Failed to retrieve settings', 500);
      }

      // Transform to match API response format
      const response = {
        audioQuality: settings.audio_quality || 'high',
        language: settings.language || 'en',
        theme: settings.theme || 'system',
        autoPlay: settings.auto_play !== null ? settings.auto_play : true,
        notifications: {
          anthemReady: settings.anthem_ready_notification !== null ? settings.anthem_ready_notification : true,
          streakReminder: settings.streak_reminder_notification !== null ? settings.streak_reminder_notification : true,
          weeklyReport: settings.weekly_report_notification !== null ? settings.weekly_report_notification : false
        }
      };

      successResponse(res, response, 'Settings retrieved successfully');
    } catch (error) {
      console.error('Error getting settings:', error);
      errorResponse(res, 'Failed to retrieve settings', 500);
    }
  },

  /**
   * Update user settings
   * PATCH /api/v1/settings
   */
  async updateSettings(req, res) {
    try {
      console.log('SETTINGS_CONTROLLER: PATCH /api/v1/settings');
      const userId = req.user.user_id;
      const { audioQuality, language, theme, autoPlay, notifications } = req.body;

      const updatedSettings = await settingsModel.updateSettings(userId, {
        audioQuality,
        language,
        theme,
        autoPlay,
        notifications
      });

      if (!updatedSettings) {
        return errorResponse(res, 'Failed to update settings', 500);
      }

      // Transform response
      const response = {
        audioQuality: updatedSettings.audio_quality,
        language: updatedSettings.language,
        theme: updatedSettings.theme,
        autoPlay: updatedSettings.auto_play,
        notifications: {
          anthemReady: updatedSettings.anthem_ready_notification,
          streakReminder: updatedSettings.streak_reminder_notification,
          weeklyReport: updatedSettings.weekly_report_notification
        }
      };

      successResponse(res, response, 'Settings updated successfully');
    } catch (error) {
      console.error('Error updating settings:', error);
      errorResponse(res, 'Failed to update settings', 500);
    }
  },

  /**
   * Get privacy settings
   * GET /api/v1/settings/privacy
   */
  async getPrivacySettings(req, res) {
    try {
      console.log('SETTINGS_CONTROLLER: GET /api/v1/settings/privacy');
      const userId = req.user.user_id;

      const privacySettings = await settingsModel.getPrivacySettings(userId);

      if (!privacySettings) {
        return errorResponse(res, 'Failed to retrieve privacy settings', 500);
      }

      // Transform to match API response format
      const response = {
        showProfile: privacySettings.show_profile !== null ? privacySettings.show_profile : true,
        shareStats: privacySettings.share_stats !== null ? privacySettings.share_stats : true,
        showCountry: privacySettings.show_country !== null ? privacySettings.show_country : true,
        allowMessaging: privacySettings.allow_messaging !== null ? privacySettings.allow_messaging : false
      };

      successResponse(res, response, 'Privacy settings retrieved successfully');
    } catch (error) {
      console.error('Error getting privacy settings:', error);
      errorResponse(res, 'Failed to retrieve privacy settings', 500);
    }
  },

  /**
   * Update privacy settings
   * PATCH /api/v1/settings/privacy
   */
  async updatePrivacySettings(req, res) {
    try {
      console.log('SETTINGS_CONTROLLER: PATCH /api/v1/settings/privacy');
      const userId = req.user.user_id;
      const { showProfile, shareStats, showCountry, allowMessaging } = req.body;

      const updatedPrivacy = await settingsModel.updatePrivacySettings(userId, {
        showProfile,
        shareStats,
        showCountry,
        allowMessaging
      });

      if (!updatedPrivacy) {
        return errorResponse(res, 'Failed to update privacy settings', 500);
      }

      // Transform response
      const response = {
        showProfile: updatedPrivacy.show_profile,
        shareStats: updatedPrivacy.share_stats,
        showCountry: updatedPrivacy.show_country,
        allowMessaging: updatedPrivacy.allow_messaging
      };

      successResponse(res, response, 'Privacy settings updated successfully');
    } catch (error) {
      console.error('Error updating privacy settings:', error);
      errorResponse(res, 'Failed to update privacy settings', 500);
    }
  }
};