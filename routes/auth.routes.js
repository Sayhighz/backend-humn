import { Router } from 'express';
import { authController } from '../controllers/auth.controller.js';

const router = Router();

// POST /api/v1/auth/world-id/verify - Verify World ID authentication
router.post('/world-id/verify', authController.verifyWorldId);

// POST /api/v1/auth/refresh - Refresh access token
router.post('/refresh', authController.refreshToken);

// POST /api/v1/auth/logout - Logout user
router.post('/logout', authController.logout);

// GET /api/v1/auth/me - Get current user info
router.get('/me', authController.getMe);

export default router;