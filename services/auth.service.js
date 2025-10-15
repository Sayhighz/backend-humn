import jwt from 'jsonwebtoken';
import { userModel } from '../models/user.model.js';
import { errorResponse } from '../utils/response.js';

/**
 * Authentication Service
 * Handles user authentication, JWT token management, and session handling
 */

export class AuthService {
  /**
   * Generate Access Token (short-lived)
   */
  generateAccessToken(user) {
    const payload = {
      userId: user.user_id,
      email: user.email,
      username: user.username,
      country: user.country_code,
      isVerified: user.is_verified,
      type: 'access'
    };

    const secret = process.env.JWT_SECRET || 'mock-secret-key';
    const expiresIn = process.env.JWT_ACCESS_EXPIRES_IN || '15m'; // 15 นาที

    return jwt.sign(payload, secret, { expiresIn });
  }

  /**
   * Generate Refresh Token (long-lived)
   */
  generateRefreshToken(user) {
    const payload = {
      userId: user.user_id,
      type: 'refresh'
    };

    const secret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || 'mock-refresh-secret';
    const expiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '7d'; // 7 วัน

    return jwt.sign(payload, secret, { expiresIn });
  }

  /**
   * Generate both Access and Refresh tokens
   */
  generateTokens(user) {
    const accessToken = this.generateAccessToken(user);
    const refreshToken = this.generateRefreshToken(user);

    return {
      accessToken,
      refreshToken,
      accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
      refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
    };
  }

  /**
   * Generate JWT token (legacy - for backward compatibility)
   */
  generateToken(user) {
    const payload = {
      userId: user.user_id,
      email: user.email,
      username: user.username,
      country: user.country_code,
      isVerified: user.is_verified
    };

    const secret = process.env.JWT_SECRET || 'mock-secret-key';
    const expiresIn = process.env.JWT_EXPIRES_IN || '24h';

    return jwt.sign(payload, secret, { expiresIn });
  }

  /**
   * Verify Access Token
   */
  verifyAccessToken(token) {
    try {
      const secret = process.env.JWT_SECRET || 'mock-secret-key';
      const decoded = jwt.verify(token, secret);
      
      // Check if it's an access token (if type is specified)
      if (decoded.type && decoded.type !== 'access') {
        throw new Error('Invalid token type');
      }
      
      return decoded;
    } catch (error) {
      throw new Error('Invalid access token');
    }
  }

  /**
   * Verify Refresh Token
   */
  verifyRefreshToken(token) {
    try {
      const secret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
      const decoded = jwt.verify(token, secret);
      
      // Check if it's a refresh token
      if (decoded.type && decoded.type !== 'refresh') {
        throw new Error('Invalid token type');
      }
      
      return decoded;
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Refresh token expired');
      }
      throw new Error('Invalid refresh token');
    }
  }

  /**
   * Verify JWT token (legacy)
   */
  verifyToken(token) {
    try {
      const secret = process.env.JWT_SECRET || 'mock-secret-key';
      return jwt.verify(token, secret);
    } catch (error) {
      throw new Error('Invalid token');
    }
  }

  /**
   * Mock login - creates or finds a user and returns JWT tokens
   */
  async mockLogin(userData = {}) {
    try {
      const defaultUser = {
        username: `mockuser_${Date.now()}`,
        email: `mock${Date.now()}@example.com`,
        country_code: 'TH'
      };

      const userInfo = { ...defaultUser, ...userData };

      let user = await userModel.findByEmail(userInfo.email);

      if (!user) {
        user = await userModel.createUser(userInfo);
      }

      await userModel.updateLastLogin(user.user_id);

      // Generate both access and refresh tokens
      const tokens = this.generateTokens(user);

      return {
        user: {
          id: user.user_id,
          username: user.username,
          email: user.email,
          country_code: user.country_code,
          is_verified: user.is_verified,
          avatar_url: user.avatar_url,
          created_at: user.created_at,
          last_login_at: user.last_login_at
        },
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        accessExpiresIn: tokens.accessExpiresIn,
        refreshExpiresIn: tokens.refreshExpiresIn
      };
    } catch (error) {
      console.error('Mock login error:', error);
      throw new Error('Failed to create mock login');
    }
  }

  /**
   * Get user from access token
   */
  async getUserFromToken(token) {
    try {
      const decoded = this.verifyAccessToken(token);
      const user = await userModel.getUserProfile(decoded.userId);

      if (!user) {
        throw new Error('User not found');
      }

      return user;
    } catch (error) {
      throw new Error('Invalid token or user not found');
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken) {
    try {
      console.log('AUTH_SERVICE: Refreshing access token');

      // Verify refresh token
      const decoded = this.verifyRefreshToken(refreshToken);

      // Get user from database
      const user = await userModel.getUserProfile(decoded.userId);

      if (!user) {
        throw new Error('User not found');
      }

      if (!user.is_active) {
        throw new Error('User account is inactive');
      }

      // Generate new access token
      const accessToken = this.generateAccessToken(user);

      // Optionally generate new refresh token (rotate refresh tokens)
      const shouldRotateRefresh = process.env.JWT_ROTATE_REFRESH_TOKEN === 'true';
      const newRefreshToken = shouldRotateRefresh ? this.generateRefreshToken(user) : refreshToken;

      console.log('AUTH_SERVICE: Access token refreshed successfully');

      return {
        user: {
          id: user.user_id,
          username: user.username,
          email: user.email,
          country_code: user.country_code,
          is_verified: user.is_verified,
          avatar_url: user.avatar_url
        },
        accessToken,
        refreshToken: newRefreshToken,
        accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
        refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
        rotated: shouldRotateRefresh
      };
    } catch (error) {
      console.error('AUTH_SERVICE: Error refreshing token:', error);
      throw error;
    }
  }

  /**
   * Refresh token (legacy - for backward compatibility)
   */
  async refreshToken(oldToken) {
    try {
      const decoded = this.verifyToken(oldToken);
      const user = await userModel.getUserProfile(decoded.userId);

      if (!user) {
        throw new Error('User not found');
      }

      const newToken = this.generateToken(user);

      return {
        user: {
          id: user.user_id,
          username: user.username,
          email: user.email,
          country_code: user.country_code,
          is_verified: user.is_verified,
          avatar_url: user.avatar_url,
          created_at: user.created_at,
          last_login_at: user.last_login_at
        },
        token: newToken,
        expiresIn: process.env.JWT_EXPIRES_IN || '24h'
      };
    } catch (error) {
      throw new Error('Failed to refresh token');
    }
  }

  /**
   * Logout (invalidate token on client side)
   */
  async logout(token) {
    // In a real implementation with Redis, you would blacklist the token
    // For now, just return success
    return { success: true, message: 'Logged out successfully' };
  }
}

// Create and export auth service instance
export const authService = new AuthService();

export default authService;