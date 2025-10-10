import { Router } from 'express';
import authRoutes from './auth.routes.js';
import userRoutes from './user.routes.js';
import contributionRoutes from './contribution.routes.js';
import anthemRoutes from './anthem.routes.js';
import statsRoutes from './stats.routes.js';
import libraryRoutes from './library.routes.js';
import notificationRoutes from './notification.routes.js';
import settingsRoutes from './settings.routes.js';
import geoRoutes from './geo.routes.js';
import downloadRoutes from './download.routes.js';
import adminRoutes from './admin.routes.js';

const router = Router();

// API version prefix
const API_VERSION = '/api/v1';

// Mount all routes with API version prefix
router.use(`${API_VERSION}/auth`, authRoutes);
router.use(`${API_VERSION}/users`, userRoutes);
router.use(`${API_VERSION}/contributions`, contributionRoutes);
router.use(`${API_VERSION}/anthems`, anthemRoutes);
router.use(`${API_VERSION}/stats`, statsRoutes);
router.use(`${API_VERSION}/library`, libraryRoutes);
router.use(`${API_VERSION}/notifications`, notificationRoutes);
router.use(`${API_VERSION}/settings`, settingsRoutes);
router.use(`${API_VERSION}/geo`, geoRoutes);
router.use(`${API_VERSION}/downloads`, downloadRoutes);
router.use(`${API_VERSION}/admin`, adminRoutes);

// API info endpoint
router.get('/api', (req, res) => {
  res.json({
    message: 'HUMN Voice Collection Platform API',
    version: 'v1',
    status: 'running',
    timestamp: new Date().toISOString()
  });
});

export default router;