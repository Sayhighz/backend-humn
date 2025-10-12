import { Router } from 'express';
import { notificationController } from '../controllers/notification.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import {
  validateGetNotificationsQuery,
  validateNotificationIdParam,
  validatePreferencesBody,
  validateRegisterDeviceBody
} from '../validators/notification.validator.js';

const router = Router();

// GET /api/v1/notifications - Get user notifications
router.get(
  '/',
  requireAuth,
  validateGetNotificationsQuery,
  notificationController.getNotifications
);

// PATCH /api/v1/notifications/:notificationId/read - Mark notification as read
router.patch(
  '/:notificationId/read',
  requireAuth,
  validateNotificationIdParam,
  notificationController.markNotificationRead
);

// PATCH /api/v1/notifications/read-all - Mark all notifications as read
router.patch(
  '/read-all',
  requireAuth,
  notificationController.markAllNotificationsRead
);

// POST /api/v1/notifications/preferences - Update notification preferences
router.post(
  '/preferences',
  requireAuth,
  validatePreferencesBody,
  notificationController.updateNotificationPreferences
);

// POST /api/v1/notifications/register-device - Register device for push notifications
router.post(
  '/register-device',
  requireAuth,
  validateRegisterDeviceBody,
  notificationController.registerDevice
);

export default router;