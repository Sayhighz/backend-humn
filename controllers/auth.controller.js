import { successResponse, errorResponse } from '../utils/response.js';
import { authService } from '../services/auth.service.js';
import { worldIdService } from '../services/worldId.service.js';
import { worldIdConfig } from '../config/worldId.config.js';

/**
 * Authentication Controller
 */

export const authController = {
  /**
   * Mock login
   * POST /api/v1/auth/mock-login
   */
  async mockLogin(req, res) {
    try {
      console.log('AUTH_CONTROLLER: POST /api/v1/auth/mock-login');

      const userData = req.body || {};
      const result = await authService.mockLogin(userData);

      successResponse(res, result, 'Mock login successful');
    } catch (error) {
      console.error('Mock login error:', error);
      errorResponse(res, 'Failed to create mock login', 500);
    }
  },

  /**
   * Verify World ID (REAL)
   * POST /api/v1/auth/world-id/verify
   */
  async verifyWorldId(req, res) {
    try {
      console.log('AUTH_CONTROLLER: POST /api/v1/auth/world-id/verify (REAL)');

      const { proof, merkle_root, nullifier_hash, credential_type, signal, userData } = req.body;

      if (!proof || !merkle_root || !nullifier_hash) {
        return errorResponse(res, 'Missing required fields: proof, merkle_root, nullifier_hash', 400);
      }

      const isUsed = await worldIdService.isNullifierUsed(nullifier_hash);
      if (isUsed) {
        return errorResponse(res, 'This World ID has already been used', 400);
      }

      const proofData = { proof, merkle_root, nullifier_hash, credential_type, signal };
      const result = await worldIdService.verifyAndCreateUser(proofData, userData, false);

      const tokens = authService.generateTokens(result.user);

      const response = {
        user: result.user,
        verification: result.verification,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        accessExpiresIn: tokens.accessExpiresIn,
        refreshExpiresIn: tokens.refreshExpiresIn
      };

      successResponse(res, response, 'World ID verification successful');
    } catch (error) {
      console.error('World ID verification error:', error);
      errorResponse(res, error.message || 'World ID verification failed', 400);
    }
  },

  /**
   * Verify World ID Mock
   * POST /api/v1/auth/world-id/verify-mock
   */
  async verifyWorldIdMock(req, res) {
    try {
      console.log('AUTH_CONTROLLER: POST /api/v1/auth/world-id/verify-mock (MOCK)');

      if (!worldIdConfig.enableMock) {
        return errorResponse(res, 'Mock verification is disabled in production', 403);
      }

      const { nullifier_hash, credential_type, userData } = req.body;

      if (!nullifier_hash) {
        return errorResponse(res, 'Missing required field: nullifier_hash', 400);
      }

      const isUsed = await worldIdService.isNullifierUsed(nullifier_hash);
      if (isUsed) {
        return errorResponse(res, 'This nullifier hash has already been used', 400);
      }

      const proofData = { nullifier_hash, credential_type };
      const result = await worldIdService.verifyAndCreateUser(proofData, userData, true);

      const tokens = authService.generateTokens(result.user);

      const response = {
        user: result.user,
        verification: result.verification,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        accessExpiresIn: tokens.accessExpiresIn,
        refreshExpiresIn: tokens.refreshExpiresIn,
        warning: 'This is a MOCK verification for development only'
      };

      successResponse(res, response, 'Mock World ID verification successful');
    } catch (error) {
      console.error('Mock World ID verification error:', error);
      errorResponse(res, error.message || 'Mock verification failed', 400);
    }
  },

  /**
   * Refresh access token
   * POST /api/v1/auth/refresh
   * Body: { refreshToken: string }
   */
  async refreshToken(req, res) {
    try {
      console.log('AUTH_CONTROLLER: POST /api/v1/auth/refresh');

      const { refreshToken } = req.body;

      if (!refreshToken) {
        return errorResponse(res, 'Refresh token is required', 400);
      }

      const result = await authService.refreshAccessToken(refreshToken);

      successResponse(res, result, 'Token refreshed successfully');
    } catch (error) {
      console.error('Token refresh error:', error);
      
      if (error.message === 'Refresh token expired') {
        return errorResponse(res, 'Refresh token expired. Please login again', 401);
      }
      
      if (error.message === 'User account is inactive') {
        return errorResponse(res, 'User account is inactive', 403);
      }
      
      errorResponse(res, 'Failed to refresh token', 401);
    }
  },

  /**
   * Logout
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
   * Get current user
   * GET /api/v1/auth/me
   */
  async getMe(req, res) {
    try {
      console.log('AUTH_CONTROLLER: GET /api/v1/auth/me');

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