import { Router } from 'express';
import { downloadController } from '../controllers/download.controller.js';
import { validateDownloadRequest, validateGetDownloadRequest, validateGetLicense, handleValidationErrors } from '../validators/download.validator.js';

const router = Router();

// POST /api/v1/downloads/request - Request download
router.post('/request',
  validateDownloadRequest,
  handleValidationErrors,
  downloadController.requestDownload
);

// GET /api/v1/downloads/license - Get download license
router.get('/license',
  validateGetLicense,
  handleValidationErrors,
  downloadController.getDownloadLicense
);

// GET /api/v1/downloads/:requestId - Get download request status
router.get('/:requestId',
  validateGetDownloadRequest,
  handleValidationErrors,
  downloadController.getDownloadRequest
);

// GET /api/v1/downloads/license - Get download license
router.get('/license',
  validateGetLicense,
  handleValidationErrors,
  downloadController.getDownloadLicense
);

// Admin routes (would need admin middleware)
// router.put('/:requestId/approve', downloadController.approveDownloadRequest);
// router.put('/:requestId/reject', downloadController.rejectDownloadRequest);

export default router;