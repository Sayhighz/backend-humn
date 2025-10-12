import { body, param, validationResult } from 'express-validator';

/**
 * Admin Validation Rules
 */
export const adminValidators = {
  /**
   * Generate anthem validation
   */
  generateAnthem: [
    body('date')
      .isISO8601()
      .withMessage('Date must be in YYYY-MM-DD format')
      .custom((value) => {
        const date = new Date(value);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (date > today) {
          throw new Error('Cannot generate anthem for future dates');
        }

        return true;
      }),
    (req, res, next) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }
      next();
    }
  ],

  /**
   * Ban user validation
   */
  banUser: [
    param('userId')
      .isUUID()
      .withMessage('User ID must be a valid UUID'),
    body('reason')
      .trim()
      .isLength({ min: 1, max: 500 })
      .withMessage('Ban reason must be between 1 and 500 characters')
      .notEmpty()
      .withMessage('Ban reason is required'),
    (req, res, next) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }
      next();
    }
  ]
};

export default adminValidators;