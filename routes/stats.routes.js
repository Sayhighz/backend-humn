import { Router } from 'express';
import { statsController } from '../controllers/stats.controller.js';

const router = Router();

// GET /api/v1/stats/global - Get global statistics
router.get('/global', statsController.getGlobalStats);

// GET /api/v1/stats/countries - Get country statistics
router.get('/countries', statsController.getCountryStats);

// GET /api/v1/stats/leaderboard - Get leaderboard
router.get('/leaderboard', statsController.getLeaderboard);

// GET /api/v1/stats/user/:userId/streak - Get user streak statistics
router.get('/user/:userId/streak', statsController.getUserStreak);

// GET /api/v1/stats/user/:userId/countries - Get user country statistics
router.get('/user/:userId/countries', statsController.getUserCountries);

// GET /api/v1/stats/user/:userId/timeline - Get user timeline statistics
router.get('/user/:userId/timeline', statsController.getUserTimeline);

export default router;