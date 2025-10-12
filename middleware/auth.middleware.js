import { authService } from '../services/auth.service.js';
import { errorResponse } from '../utils/response.js';

/**
 * Authentication Middleware
 * Handles JWT token validation and user authentication
 */

/**
 * Authenticate user request using JWT token
 * Extracts token from Authorization header and validates it
 */
export const authenticate = async (req, res, next) => {
  try {
    console.log('MIDDLEWARE: authenticate');

    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return errorResponse(res, 'Access token required', 401);
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      return errorResponse(res, 'Access token required', 401);
    }

    // Verify token and get user
    const user = await authService.getUserFromToken(token);

    // Attach user to request object
    req.user = user;
    req.token = token;

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return errorResponse(res, 'Invalid or expired token', 401);
  }
};

/**
 * Optional authentication (doesn't fail if no token)
 * Useful for endpoints that work with or without authentication
 */
export const optionalAuth = async (req, res, next) => {
  try {
    console.log('MIDDLEWARE: optionalAuth');

    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];

      if (token) {
        try {
          const user = await authService.getUserFromToken(token);
          req.user = user;
          req.token = token;
        } catch (error) {
          // Ignore token validation errors for optional auth
          console.log('Optional auth token invalid, continuing without user');
        }
      }
    }

    next();
  } catch (error) {
    console.error('Optional auth error:', error);
    next(); // Continue even if there's an error
  }
};

/**
 * Verify user is authenticated (alias for authenticate)
 * Use this for protected routes that require authentication
 */
export const requireAuth = authenticate;