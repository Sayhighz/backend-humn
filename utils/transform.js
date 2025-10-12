/**
 * Transform utilities for notifications module
 * - snake_case to camelCase converters
 * - pagination helpers
 * - row mappers for API responses
 */

const CAMEL_CACHE = new Map();

/**
 * Convert snake_case string to camelCase (with simple cache)
 */
export const toCamelCase = (str) => {
  if (!str) return str;
  const cached = CAMEL_CACHE.get(str);
  if (cached) return cached;
  const out = str.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
  CAMEL_CACHE.set(str, out);
  return out;
};

/**
 * Deep-convert object keys to camelCase
 */
export const toCamelObject = (input) => {
  if (input === null || input === undefined) return input;
  if (Array.isArray(input)) return input.map(toCamelObject);
  if (typeof input !== 'object') return input;
  const result = {};
  for (const [k, v] of Object.entries(input)) {
    result[toCamelCase(k)] = toCamelObject(v);
  }
  return result;
};

/**
 * Normalize boolean querystring values
 */
export const normalizeBooleanQuery = (value, defaultValue = false) => {
  if (value === undefined || value === null || value === '') return defaultValue;
  if (typeof value === 'boolean') return value;
  const str = String(value).toLowerCase().trim();
  return str === 'true' || str === '1' || str === 'yes' || str === 'y';
};

export const PAGE_SIZE_DEFAULT = 20;

/**
 * Build pagination values with sane defaults
 */
export const buildPagination = (page = 1, limit = PAGE_SIZE_DEFAULT) => {
  const p = Number.isFinite(+page) && +page > 0 ? Math.floor(+page) : 1;
  const l = Number.isFinite(+limit) && +limit > 0 ? Math.floor(+limit) : PAGE_SIZE_DEFAULT;
  const offset = (p - 1) * l;
  return { page: p, limit: l, offset };
};

/**
 * Map a notifications row (snake_case) to API shape (camelCase)
 */
export const mapNotificationRow = (row) => {
  if (!row) return null;
  const c = toCamelObject(row);
  // Ensure metadata is an object
  if (c.metadata == null || typeof c.metadata !== 'object') c.metadata = {};
  return {
    notificationId: c.notificationId,
    type: c.type,
    title: c.title,
    message: c.message,
    relatedAnthemId: c.relatedAnthemId ?? null,
    relatedUserId: c.relatedUserId ?? null,
    isRead: Boolean(c.isRead),
    readAt: c.readAt,
    isSent: Boolean(c.isSent),
    sentAt: c.sentAt,
    deliveryMethod: c.deliveryMethod ?? null,
    createdAt: c.createdAt,
    expiresAt: c.expiresAt ?? null,
    metadata: c.metadata
  };
};

/**
 * Map a user_settings row to notification preferences shape
 */
export const mapPreferencesRow = (row) => {
  if (!row) return { anthemReady: true, streakReminder: true, weeklyReport: false };
  const c = toCamelObject(row);
  return {
    anthemReady: Boolean(c.anthemReadyNotification),
    streakReminder: Boolean(c.streakReminderNotification),
    weeklyReport: Boolean(c.weeklyReportNotification)
  };
};

export const ALLOWED_PLATFORMS = new Set(['ios', 'android', 'web']);
export const isValidPlatform = (platform) => ALLOWED_PLATFORMS.has(String(platform || '').toLowerCase());

/**
 * Pick selected keys from an object
 */
export const pick = (obj, keys) => {
  if (!obj) return {};
  const out = {};
  for (const k of keys) {
    if (Object.prototype.hasOwnProperty.call(obj, k)) out[k] = obj[k];
  }
  return out;
};

export default {
  toCamelCase,
  toCamelObject,
  normalizeBooleanQuery,
  PAGE_SIZE_DEFAULT,
  buildPagination,
  mapNotificationRow,
  mapPreferencesRow,
  ALLOWED_PLATFORMS,
  isValidPlatform,
  pick
};