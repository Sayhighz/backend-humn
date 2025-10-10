import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

// Import routes
import routes from './routes/index.js';

// Import middleware
import { corsMiddleware } from './middleware/cors.middleware.js';
import { errorHandler, notFoundHandler } from './middleware/error.middleware.js';
import { rateLimiter } from './middleware/rateLimit.middleware.js';

// Load environment variables
dotenv.config();

// Create Express app
const app = express();

// Basic middleware
app.use(helmet()); // Security headers
app.use(morgan('combined')); // Logging
app.use(express.json({ limit: '10mb' })); // JSON body parser
app.use(express.urlencoded({ extended: true })); // URL-encoded parser

// CORS middleware
app.use(corsMiddleware);

// Rate limiting
app.use(rateLimiter);

// Health check endpoint
app.get('/health', (req, res) => {
  console.log('HEALTH_CHECK: GET /health');
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0'
  });
});

// API routes
app.use('/', routes);

// Root endpoint
app.get('/', (req, res) => {
  console.log('ROOT_ENDPOINT: GET /');
  res.json({
    message: 'HUMN Voice Collection Platform API',
    version: 'v1',
    status: 'running',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/health',
      api: '/api',
      auth: '/api/v1/auth',
      users: '/api/v1/users',
      contributions: '/api/v1/contributions',
      anthems: '/api/v1/anthems',
      stats: '/api/v1/stats',
      library: '/api/v1/library',
      notifications: '/api/v1/notifications',
      settings: '/api/v1/settings',
      geo: '/api/v1/geo',
      downloads: '/api/v1/downloads',
      admin: '/api/v1/admin'
    }
  });
});

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || 'localhost';

app.listen(PORT, () => {
  console.log(`🚀 HUMN API Server running on http://${HOST}:${PORT}`);
  console.log(`📚 API Documentation: http://${HOST}:${PORT}/api`);
  console.log(`🏥 Health Check: http://${HOST}:${PORT}/health`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📊 Port: ${PORT}`);
});

export default app;
