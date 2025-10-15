import { Router } from 'express';
import { contributionController } from '../controllers/contribution.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import multer from 'multer';

const router = Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'), // โฟลเดอร์เก็บไฟล์
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});

const upload = multer({ storage });

// GET /api/v1/contributions/check-daily - Check if user has contributed today
router.get('/check-daily',authenticate, contributionController.checkDailyContribution);

// POST /api/v1/contributions/upload - Upload audio contribution
router.post('/upload',authenticate,upload.single('audioFile'), contributionController.uploadContribution);

// GET /api/v1/contributions/my - Get user's contributions
router.get('/my',authenticate, contributionController.getMyContributions);

// GET /api/v1/contributions/today - Get today's contributions
router.get('/today', contributionController.getTodayContributions);

// GET /api/v1/contributions/:contributionId - Get contribution by ID
router.get('/:contributionId', contributionController.getContributionById);

// DELETE /api/v1/contributions/:contributionId - Delete contribution
router.delete('/:contributionId', contributionController.deleteContribution);

export default router;