import { errorResponse } from '../utils/response.js';

/**
 * Error Handling Middleware
 * Handles all errors and returns consistent error responses
 */

/**
 * Global error handler
 */
export const errorHandler = (err, req, res, next) => {
  console.log('MIDDLEWARE: errorHandler');
  console.error('Error:', err);
  
  // Default error response
  errorResponse(res, err.message || 'Internal Server Error', err.statusCode || 500);
};

/**
 * 404 handler for unknown routes
 */
export const notFoundHandler = (req, res) => {
  console.log('MIDDLEWARE: notFoundHandler');
  errorResponse(res, `Route ${req.originalUrl} not found`, 404);
};

/**
 * Async error wrapper
 */
export const asyncHandler = (fn) => {
  return (req, res, next) => {
    console.log('MIDDLEWARE: asyncHandler');
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};