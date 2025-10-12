import Joi from 'joi';

/**
 * Settings Validators
 * Validation schemas for settings endpoints
 */

export const updateSettingsSchema = Joi.object({
  audioQuality: Joi.string().valid('low', 'medium', 'high').default('high'),
  language: Joi.string().min(2).max(5).default('en'),
  theme: Joi.string().valid('light', 'dark', 'system').default('system'),
  autoPlay: Joi.boolean().default(true),
  notifications: Joi.object({
    anthemReady: Joi.boolean().default(true),
    streakReminder: Joi.boolean().default(true),
    weeklyReport: Joi.boolean().default(false)
  }).default()
});

export const updatePrivacySettingsSchema = Joi.object({
  showProfile: Joi.boolean().default(true),
  shareStats: Joi.boolean().default(true),
  showCountry: Joi.boolean().default(true),
  allowMessaging: Joi.boolean().default(false)
});

/**
 * Validation middleware for settings endpoints
 */
export const validateUpdateSettings = (req, res, next) => {
  const { error, value } = updateSettingsSchema.validate(req.body, { stripUnknown: true });

  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }))
    });
  }

  req.body = value;
  next();
};

export const validateUpdatePrivacySettings = (req, res, next) => {
  const { error, value } = updatePrivacySettingsSchema.validate(req.body, { stripUnknown: true });

  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }))
    });
  }

  req.body = value;
  next();
};

export default {
  updateSettingsSchema,
  updatePrivacySettingsSchema,
  validateUpdateSettings,
  validateUpdatePrivacySettings
};