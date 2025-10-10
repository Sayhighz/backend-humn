import { Router } from 'express';
import { userController } from '../controllers/user.controller.js';

const router = Router();

// GET /api/v1/users/:userId - Get user by ID
router.get('/:userId', userController.getUserById);

// PATCH /api/v1/users/:userId - Update user profile
router.patch('/:userId', userController.updateUser);

// GET /api/v1/users/:userId/stats - Get user statistics
router.get('/:userId/stats', userController.getUserStats);

// DELETE /api/v1/users/:userId - Delete user account
router.delete('/:userId', userController.deleteUser);

export default router;