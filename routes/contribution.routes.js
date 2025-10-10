import { Router } from 'express';
import { contributionController } from '../controllers/contribution.controller.js';

const router = Router();

// GET /api/v1/contributions/check-daily - Check if user has contributed today
router.get('/check-daily', contributionController.checkDailyContribution);

// POST /api/v1/contributions/upload - Upload audio contribution
router.post('/upload', contributionController.uploadContribution);

// GET /api/v1/contributions/my - Get user's contributions
router.get('/my', contributionController.getMyContributions);

// GET /api/v1/contributions/today - Get today's contributions
router.get('/today', contributionController.getTodayContributions);

// GET /api/v1/contributions/:contributionId - Get contribution by ID
router.get('/:contributionId', contributionController.getContributionById);

// DELETE /api/v1/contributions/:contributionId - Delete contribution
router.delete('/:contributionId', contributionController.deleteContribution);

export default router;