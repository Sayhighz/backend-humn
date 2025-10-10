import { Router } from 'express';
import { settingsController } from '../controllers/settings.controller.js';

const router = Router();

// GET /api/v1/settings - Get user settings
router.get('/', settingsController.getSettings);

// PATCH /api/v1/settings - Update user settings
router.patch('/', settingsController.updateSettings);

// GET /api/v1/settings/privacy - Get privacy settings
router.get('/privacy', settingsController.getPrivacySettings);

// PATCH /api/v1/settings/privacy - Update privacy settings
router.patch('/privacy', settingsController.updatePrivacySettings);

export default router;