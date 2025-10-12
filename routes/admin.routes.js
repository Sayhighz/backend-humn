import { Router } from 'express';
import { adminController } from '../controllers/admin.controller.js';
import { adminValidators } from '../validators/admin.validator.js';
import { adminMiddleware } from '../middleware/admin.middleware.js';

const router = Router();

// Apply admin middleware to all routes
router.use(adminMiddleware);

// POST /api/v1/admin/anthems/generate - Generate anthem (admin operation)
router.post('/anthems/generate', adminValidators.generateAnthem, adminController.generateAnthem);

// GET /api/v1/admin/system/health - Get system health status
router.get('/system/health', adminController.getSystemHealth);

// GET /api/v1/admin/stats/overview - Get admin statistics overview
router.get('/stats/overview', adminController.getStatsOverview);

// POST /api/v1/admin/users/:userId/ban - Ban user (admin operation)
router.post('/users/:userId/ban', adminValidators.banUser, adminController.banUser);

export default router;