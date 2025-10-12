import { Router } from 'express';
import { authController } from '../controllers/auth.controller.js';
import { validateMockLogin, validateTokenRefresh, validateLogout } from '../validators/auth.validator.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

// POST /api/v1/auth/mock-login - Mock login for development/testing
router.post('/mock-login', validateMockLogin, authController.mockLogin);

// POST /api/v1/auth/world-id/verify - Verify World ID authentication (placeholder)
router.post('/world-id/verify', authController.verifyWorldId);

// POST /api/v1/auth/refresh - Refresh access token
router.post('/refresh', validateTokenRefresh, authController.refreshToken);

// POST /api/v1/auth/logout - Logout user
router.post('/logout', authenticate, validateLogout, authController.logout);

// GET /api/v1/auth/me - Get current user info
router.get('/me', authenticate, authController.getMe);

export default router;