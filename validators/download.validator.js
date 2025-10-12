import { body, param, query, validationResult } from 'express-validator';

/**
 * Download Validators
 * Validation rules for download endpoints
 */

/**
 * Validation for download request creation
 */
export const validateDownloadRequest = [
  body('anthemId')
    .notEmpty()
    .withMessage('Anthem ID is required')
    .matches(/^anthem-\d{4}-\d{2}-\d{2}$/)
    .withMessage('Invalid anthem ID format'),

  body('purpose')
    .notEmpty()
    .withMessage('Purpose is required')
    .isLength({ min: 10, max: 100 })
    .withMessage('Purpose must be between 10 and 100 characters'),

  body('email')
    .isEmail()
    .withMessage('Valid email is required')
    .normalizeEmail(),

  body('projectDescription')
    .optional()
    .isLength({ min: 20, max: 500 })
    .withMessage('Project description must be between 20 and 500 characters'),

  // Custom validation to check if anthem exists
  body('anthemId').custom(async (value) => {
    // This will be checked in the controller, but we can add basic format validation here
    return true;
  })
];

/**
 * Validation for getting download request status
 */
export const validateGetDownloadRequest = [
  param('requestId')
    .isUUID()
    .withMessage('Invalid request ID format')
];

/**
 * Validation for getting license information
 */
export const validateGetLicense = [
  query('anthemId')
    .notEmpty()
    .withMessage('Anthem ID is required')
    .matches(/^anthem-\d{4}-\d{2}-\d{2}$/)
    .withMessage('Invalid anthem ID format')
];

/**
 * Middleware to handle validation errors
 */
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};