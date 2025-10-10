import { Router } from 'express';
import { adminController } from '../controllers/admin.controller.js';

const router = Router();

// POST /api/v1/admin/anthems/generate - Generate anthem (admin operation)
router.post('/anthems/generate', adminController.generateAnthem);

// GET /api/v1/admin/system/health - Get system health status
router.get('/system/health', adminController.getSystemHealth);

// GET /api/v1/admin/stats/overview - Get admin statistics overview
router.get('/stats/overview', adminController.getStatsOverview);

// POST /api/v1/admin/users/:userId/ban - Ban user (admin operation)
router.post('/users/:userId/ban', adminController.banUser);

export default router;