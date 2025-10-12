import { Router } from 'express';
import { settingsController } from '../controllers/settings.controller.js';
import { validateUpdateSettings, validateUpdatePrivacySettings } from '../validators/settings.validator.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

// Apply auth middleware to all routes
router.use(authenticate);

// GET /api/v1/settings - Get user settings
router.get('/', settingsController.getSettings);

// PATCH /api/v1/settings - Update user settings
router.patch('/', validateUpdateSettings, settingsController.updateSettings);

// GET /api/v1/settings/privacy - Get privacy settings
router.get('/privacy', settingsController.getPrivacySettings);

// PATCH /api/v1/settings/privacy - Update privacy settings
router.patch('/privacy', validateUpdatePrivacySettings, settingsController.updatePrivacySettings);

export default router;