import { validationErrorResponse } from '../utils/response.js';
import { normalizeBooleanQuery, isValidPlatform } from '../utils/transform.js';

// Simple UUID v4 regex (accepts lowercase/uppercase)
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const isIntegerString = (v) => /^-?\d+$/.test(String(v || '').trim());

const parseBoolean = (v) => {
  if (typeof v === 'boolean') return v;
  const str = String(v || '').trim().toLowerCase();
  if (['true', '1', 'yes', 'y'].includes(str)) return true;
  if (['false', '0', 'no', 'n'].includes(str)) return false;
  return null;
};

/**
 * Validate query for GET /api/v1/notifications
 */
export const validateGetNotificationsQuery = (req, res, next) => {
  const errors = [];
  const { page, unread } = req.query || {};

  if (page !== undefined) {
    if (!isIntegerString(page) || parseInt(page, 10) < 1) {
      errors.push({ field: 'page', message: 'page must be an integer >= 1' });
    } else {
      req.query.page = parseInt(page, 10);
    }
  }

  if (unread !== undefined) {
    const b = parseBoolean(unread);
    if (b === null) {
      errors.push({ field: 'unread', message: 'unread must be a boolean' });
    } else {
      req.query.unread = b;
    }
  }

  if (errors.length) return validationErrorResponse(res, errors, 'Invalid query parameters');
  return next();
};

/**
 * Validate params for PATCH /api/v1/notifications/:notificationId/read
 */
export const validateNotificationIdParam = (req, res, next) => {
  const { notificationId } = req.params || {};
  const errors = [];
  if (!notificationId || !UUID_REGEX.test(notificationId)) {
    errors.push({ field: 'notificationId', message: 'notificationId must be a valid UUID v4' });
  }

  if (errors.length) return validationErrorResponse(res, errors, 'Invalid route parameter');
  return next();
};

/**
 * Validate body for POST /api/v1/notifications/preferences
 * Body: { anthemReady, streakReminder, weeklyReport } all booleans
 */
export const validatePreferencesBody = (req, res, next) => {
  const { body } = req;
  const errors = [];
  if (!body || typeof body !== 'object') {
    return validationErrorResponse(res, [{ field: 'body', message: 'Body is required' }], 'Invalid body');
  }

  const keys = ['anthemReady', 'streakReminder', 'weeklyReport'];
  for (const k of keys) {
    if (!(k in body)) {
      errors.push({ field: k, message: `${k} is required` });
      continue;
    }
    const parsed = parseBoolean(body[k]);
    if (parsed === null) {
      errors.push({ field: k, message: `${k} must be a boolean` });
    } else {
      body[k] = parsed;
    }
  }

  if (errors.length) return validationErrorResponse(res, errors, 'Invalid preferences payload');
  return next();
};

/**
 * Validate body for POST /api/v1/notifications/register-device
 * Body: { deviceToken: string, platform: 'ios'|'android'|'web' }
 */
export const validateRegisterDeviceBody = (req, res, next) => {
  const { body } = req;
  const errors = [];

  if (!body || typeof body !== 'object') {
    return validationErrorResponse(res, [{ field: 'body', message: 'Body is required' }], 'Invalid body');
  }

  const { deviceToken, platform } = body;

  if (!deviceToken || typeof deviceToken !== 'string' || deviceToken.trim() === '') {
    errors.push({ field: 'deviceToken', message: 'deviceToken is required and must be a non-empty string' });
  } else {
    body.deviceToken = deviceToken.trim();
  }

  const pf = String(platform || '').toLowerCase();
  if (!isValidPlatform(pf)) {
    errors.push({ field: 'platform', message: 'platform must be one of: ios, android, web' });
  } else {
    body.platform = pf;
  }

  if (errors.length) return validationErrorResponse(res, errors, 'Invalid device registration payload');
  return next();
};

export default {
  validateGetNotificationsQuery,
  validateNotificationIdParam,
  validatePreferencesBody,
  validateRegisterDeviceBody
};