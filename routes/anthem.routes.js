import { Router } from 'express';
import { anthemController } from '../controllers/anthem.controller.js';

const router = Router();

// GET /api/v1/anthems - Get all anthems
router.get('/', anthemController.getAnthems);

// GET /api/v1/anthems/today - Get today's anthem
router.get('/today', anthemController.getTodayAnthem);

// GET /api/v1/anthems/:anthemId - Get anthem by ID
router.get('/:anthemId', anthemController.getAnthemById);

// GET /api/v1/anthems/:anthemId/segments - Get anthem segments
router.get('/:anthemId/segments', anthemController.getAnthemSegments);

// GET /api/v1/anthems/:anthemId/stream - Stream anthem audio
router.get('/:anthemId/stream', anthemController.streamAnthem);

// POST /api/v1/anthems/:anthemId/play - Play anthem (track play count)
router.post('/:anthemId/play', anthemController.playAnthem);

// GET /api/v1/anthems/:anthemId/contributors - Get anthem contributors
router.get('/:anthemId/contributors', anthemController.getAnthemContributors);

// POST /api/v1/anthems/:anthemId/share - Share anthem
router.post('/:anthemId/share', anthemController.shareAnthem);

export default router;