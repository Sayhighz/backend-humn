import { successResponse, errorResponse } from '../utils/response.js';
import { authService } from '../services/auth.service.js';

/**
 * Authentication Controller
 * Handles user authentication, JWT token management, and session handling
 */

export const authController = {
  /**
   * Mock login - creates a mock user and returns JWT token
   * POST /api/v1/auth/mock-login
   */
  async mockLogin(req, res) {
    try {
      console.log('AUTH_CONTROLLER: POST /api/v1/auth/mock-login');

      // Optional user data from request body
      const userData = req.body || {};

      const result = await authService.mockLogin(userData);

      successResponse(res, result, 'Mock login successful');
    } catch (error) {
      console.error('Mock login error:', error);
      errorResponse(res, 'Failed to create mock login', 500);
    }
  },

  /**
   * Verify World ID authentication (placeholder - kept for compatibility)
   * POST /api/v1/auth/world-id/verify
   */
  async verifyWorldId(req, res) {
    console.log('AUTH_CONTROLLER: POST /api/v1/auth/world-id/verify');
    successResponse(res, null, 'World ID verification placeholder');
  },

  /**
   * Refresh access token
   * POST /api/v1/auth/refresh
   */
  async refreshToken(req, res) {
    try {
      console.log('AUTH_CONTROLLER: POST /api/v1/auth/refresh');

      const { token } = req.body;

      if (!token) {
        return errorResponse(res, 'Token is required', 400);
      }

      const result = await authService.refreshToken(token);

      successResponse(res, result, 'Token refreshed successfully');
    } catch (error) {
      console.error('Token refresh error:', error);
      errorResponse(res, 'Failed to refresh token', 401);
    }
  },

  /**
   * Logout user
   * POST /api/v1/auth/logout
   */
  async logout(req, res) {
    try {
      console.log('AUTH_CONTROLLER: POST /api/v1/auth/logout');

      const authHeader = req.headers.authorization;
      const token = authHeader && authHeader.split(' ')[1];

      const result = await authService.logout(token);

      successResponse(res, result, 'Logged out successfully');
    } catch (error) {
      console.error('Logout error:', error);
      errorResponse(res, 'Failed to logout', 500);
    }
  },

  /**
   * Get current user info
   * GET /api/v1/auth/me
   */
  async getMe(req, res) {
    try {
      console.log('AUTH_CONTROLLER: GET /api/v1/auth/me');

      // User should be attached by auth middleware
      if (!req.user) {
        return errorResponse(res, 'User not authenticated', 401);
      }

      successResponse(res, { user: req.user }, 'User info retrieved successfully');
    } catch (error) {
      console.error('Get me error:', error);
      errorResponse(res, 'Failed to get user info', 500);
    }
  }
};