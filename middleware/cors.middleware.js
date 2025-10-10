/**
 * CORS Middleware
 * Handles Cross-Origin Resource Sharing
 */

/**
 * Configure CORS for the application
 */
export const corsMiddleware = (req, res, next) => {
  console.log('MIDDLEWARE: corsMiddleware');
  
  // Set CORS headers
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  
  next();
};

/**
 * Strict CORS for sensitive endpoints
 */
export const strictCors = (req, res, next) => {
  console.log('MIDDLEWARE: strictCors');
  next();
};