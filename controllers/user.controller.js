import { successResponse, errorResponse, notFoundResponse, validationErrorResponse } from '../utils/response.js';
import { userModel } from '../models/user.model.js';

/**
 * User Controller
 * Handles user profile management and user-related operations
 */

export const userController = {
  /**
   * Get user by ID
   */
  async getUserById(req, res) {
    try {
      console.log('USER_CONTROLLER: GET /api/v1/users/:userId');

      const { userId } = req.params;

      // Validate userId parameter
      if (!userId) {
        return errorResponse(res, 'User ID is required', 400);
      }

      // Get user profile from model
      const userProfile = await userModel.getUserProfile(userId);

      if (!userProfile) {
        return notFoundResponse(res, 'User not found');
      }

      // Return user profile (excluding sensitive information)
      const responseData = {
        userId: userProfile.user_id,
        username: userProfile.username,
        email: userProfile.email,
        countryCode: userProfile.country_code,
        avatarUrl: userProfile.avatar_url,
        isVerified: userProfile.is_verified,
        isActive: userProfile.is_active,
        createdAt: userProfile.created_at,
        updatedAt: userProfile.updated_at,
        lastActiveAt: userProfile.last_active_at
      };

      console.log('USER_CONTROLLER: User profile retrieved:', responseData);

      successResponse(res, responseData, 'User profile retrieved successfully');
    } catch (error) {
      console.error('USER_CONTROLLER: Error getting user by ID:', error);
      const isDevelopment = process.env.NODE_ENV === 'development';
      errorResponse(res, 'Internal server error', 500, isDevelopment ? error.message : null);
    }
  },

  /**
   * Update user profile
   */
  async updateUser(req, res) {
    try {
      console.log('USER_CONTROLLER: PATCH /api/v1/users/:userId');

      const { userId } = req.params;
      const updateData = req.body;

      // Validate userId parameter
      if (!userId) {
        return errorResponse(res, 'User ID is required', 400);
      }

      // Check if user exists
      const existingUser = await userModel.getUserProfile(userId);
      if (!existingUser) {
        return notFoundResponse(res, 'User not found');
      }

      // Validate update data
      const allowedFields = ['username', 'email', 'country_code', 'avatar_url'];
      const filteredData = {};

      for (const field of allowedFields) {
        if (updateData[field] !== undefined) {
          // Basic validation
          if (field === 'username' && (!updateData.username || updateData.username.trim().length < 3)) {
            return validationErrorResponse(res, [{ field: 'username', message: 'Username must be at least 3 characters long' }], 'Validation Error');
          }
          if (field === 'email' && (!updateData.email || !updateData.email.includes('@'))) {
            return validationErrorResponse(res, [{ field: 'email', message: 'Invalid email format' }], 'Validation Error');
          }
          if (field === 'country_code' && (!updateData.country_code || updateData.country_code.length !== 2)) {
            return validationErrorResponse(res, [{ field: 'country_code', message: 'Country code must be 2 characters' }], 'Validation Error');
          }
          filteredData[field] = updateData[field];
        }
      }

      if (Object.keys(filteredData).length === 0) {
        return validationErrorResponse(res, [], 'No valid fields to update');
      }

      // Add updated_at timestamp
      filteredData.updated_at = new Date();

      // Update user in database
      const updatedUser = await userModel.update(userId, filteredData);

      if (!updatedUser) {
        return errorResponse(res, 'Failed to update user', 500);
      }

      // Get updated user profile
      const userProfile = await userModel.getUserProfile(userId);

      // Return updated user profile
      const responseData = {
        userId: userProfile.user_id,
        username: userProfile.username,
        email: userProfile.email,
        countryCode: userProfile.country_code,
        avatarUrl: userProfile.avatar_url,
        isVerified: userProfile.is_verified,
        isActive: userProfile.is_active,
        createdAt: userProfile.created_at,
        updatedAt: userProfile.updated_at,
        lastActiveAt: userProfile.last_active_at
      };

      successResponse(res, responseData, 'User profile updated successfully');
    } catch (error) {
      console.error('USER_CONTROLLER: Error updating user:', error);
      const isDevelopment = process.env.NODE_ENV === 'development';
      errorResponse(res, 'Internal server error', 500, isDevelopment ? error.message : null);
    }
  },

  /**
   * Get user statistics
   */
  async getUserStats(req, res) {
    try {
      console.log('USER_CONTROLLER: GET /api/v1/users/:userId/stats');

      const { userId } = req.params;

      // Validate userId parameter
      if (!userId) {
        return errorResponse(res, 'User ID is required', 400);
      }

      // Check if user exists
      const userProfile = await userModel.getUserProfile(userId);
      if (!userProfile) {
        return notFoundResponse(res, 'User not found');
      }

      // Get user statistics from model
      const userStats = await userModel.getUserStats(userId);

      if (!userStats) {
        return errorResponse(res, 'Failed to retrieve user statistics', 500);
      }

      // Format the response data
      const responseData = {
        userId: userStats.user_id,
        username: userStats.username,
        totalContributions: parseInt(userStats.total_contributions || 0),
        recentContributions: parseInt(userStats.recent_contributions || 0),
        lastContributionAt: userStats.last_contribution_at || null,
        accountCreatedAt: userStats.created_at,
        statsCalculatedAt: new Date().toISOString()
      };

      successResponse(res, responseData, 'User statistics retrieved successfully');
    } catch (error) {
      console.error('USER_CONTROLLER: Error getting user stats:', error);
      const isDevelopment = process.env.NODE_ENV === 'development';
      errorResponse(res, 'Internal server error', 500, isDevelopment ? error.message : null);
    }
  },

  /**
   * Delete user account
   */
  async deleteUser(req, res) {
    try {
      console.log('USER_CONTROLLER: DELETE /api/v1/users/:userId');

      const { userId } = req.params;

      // Validate userId parameter
      if (!userId) {
        return errorResponse(res, 'User ID is required', 400);
      }

      // Check if user exists
      const existingUser = await userModel.getUserProfile(userId);
      if (!existingUser) {
        return notFoundResponse(res, 'User not found');
      }

      // Check if user is already deactivated
      if (!existingUser.is_active) {
        return errorResponse(res, 'User account is already deactivated', 400);
      }

      // Perform soft delete (deactivate user)
      const deactivatedUser = await userModel.deactivateUser(userId);

      if (!deactivatedUser) {
        return errorResponse(res, 'Failed to delete user account', 500);
      }

      // Return success response
      const responseData = {
        userId: userId,
        deactivatedAt: new Date().toISOString(),
        status: 'deactivated'
      };

      successResponse(res, responseData, 'User account deleted successfully');
    } catch (error) {
      console.error('USER_CONTROLLER: Error deleting user:', error);
      const isDevelopment = process.env.NODE_ENV === 'development';
      errorResponse(res, 'Internal server error', 500, isDevelopment ? error.message : null);
    }
  }
};