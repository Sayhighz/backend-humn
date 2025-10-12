import jwt from 'jsonwebtoken';
import { userModel } from '../models/user.model.js';
import { errorResponse } from '../utils/response.js';

/**
 * Authentication Service
 * Handles user authentication, JWT token management, and session handling
 */

export class AuthService {
  /**
   * Generate JWT token for user
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
   * Verify JWT token
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
   * Mock login - creates or finds a user and returns JWT token
   * For development/testing purposes only
   */
  async mockLogin(userData = {}) {
    try {
      // Default mock user data
      const defaultUser = {
        username: `mockuser_${Date.now()}`,
        email: `mock${Date.now()}@example.com`,
        country_code: 'TH'
      };

      // Merge with provided data
      const userInfo = { ...defaultUser, ...userData };

      // Try to find existing user by email
      let user = await userModel.findByEmail(userInfo.email);

      if (!user) {
        // Create new mock user
        user = await userModel.createUser(userInfo);
      }

      // Update last login
      await userModel.updateLastLogin(user.user_id);

      // Generate token
      const token = this.generateToken(user);

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
        token,
        expiresIn: process.env.JWT_EXPIRES_IN || '24h'
      };
    } catch (error) {
      console.error('Mock login error:', error);
      throw new Error('Failed to create mock login');
    }
  }

  /**
   * Get user from token
   */
  async getUserFromToken(token) {
    try {
      const decoded = this.verifyToken(token);
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
   * Refresh token
   */
  async refreshToken(oldToken) {
    try {
      const decoded = this.verifyToken(oldToken);
      const user = await userModel.getUserProfile(decoded.userId);

      if (!user) {
        throw new Error('User not found');
      }

      // Generate new token
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
    // In a real implementation, you might want to blacklist tokens
    // For now, just return success
    return { success: true, message: 'Logged out successfully' };
  }
}

// Create and export auth service instance
export const authService = new AuthService();

export default authService;