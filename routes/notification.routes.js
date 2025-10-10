import { Router } from 'express';
import { notificationController } from '../controllers/notification.controller.js';

const router = Router();

// GET /api/v1/notifications - Get user notifications
router.get('/', notificationController.getNotifications);

// PATCH /api/v1/notifications/:notificationId/read - Mark notification as read
router.patch('/:notificationId/read', notificationController.markNotificationRead);

// PATCH /api/v1/notifications/read-all - Mark all notifications as read
router.patch('/read-all', notificationController.markAllNotificationsRead);

// POST /api/v1/notifications/preferences - Update notification preferences
router.post('/preferences', notificationController.updateNotificationPreferences);

// POST /api/v1/notifications/register-device - Register device for push notifications
router.post('/register-device', notificationController.registerDevice);

export default router;