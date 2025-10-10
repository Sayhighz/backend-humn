import { Router } from 'express';
import { downloadController } from '../controllers/download.controller.js';

const router = Router();

// POST /api/v1/downloads/request - Request download
router.post('/request', downloadController.requestDownload);

// GET /api/v1/downloads/:requestId - Get download request status
router.get('/:requestId', downloadController.getDownloadRequest);

// GET /api/v1/downloads/license - Get download license
router.get('/license', downloadController.getDownloadLicense);

export default router;