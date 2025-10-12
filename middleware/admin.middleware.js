import { errorResponse } from '../utils/response.js';

/**
 * Admin Middleware
 * Handles administrative access and permissions
 */

/**
 * Verify admin access - main admin middleware
 */
export const adminMiddleware = (req, res, next) => {
  try {
    console.log('MIDDLEWARE: adminMiddleware - checking admin access');

    // In a real implementation, this would check JWT token and user role
    // For now, we'll use a simple header check or environment variable

    const adminKey = req.headers['x-admin-key'] || req.headers['authorization'];
    const expectedKey = process.env.ADMIN_API_KEY || 'admin-secret-key';

    if (!adminKey || adminKey !== `Bearer ${expectedKey}`) {
      return errorResponse(res, 'Admin access required', 403);
    }

    // Set admin context
    req.admin = {
      authenticated: true,
      timestamp: new Date().toISOString(),
      ip: req.ip || req.connection.remoteAddress
    };

    console.log('MIDDLEWARE: Admin access granted');
    next();
  } catch (error) {
    console.error('MIDDLEWARE: Admin middleware error:', error);
    errorResponse(res, 'Admin authentication failed', 500);
  }
};

/**
 * Verify admin access (legacy)
 */
export const requireAdmin = adminMiddleware;

/**
 * Check admin permissions
 */
export const checkAdminPermissions = (permission) => {
  return (req, res, next) => {
    console.log(`MIDDLEWARE: checkAdminPermissions - ${permission}`);

    // In a real implementation, this would check specific permissions
    // For now, all authenticated admins have all permissions
    if (!req.admin?.authenticated) {
      return errorResponse(res, 'Admin authentication required', 403);
    }

    next();
  };
};

/**
 * Verify system admin access
 */
export const requireSystemAdmin = (req, res, next) => {
  console.log('MIDDLEWARE: requireSystemAdmin');

  if (!req.admin?.authenticated) {
    return errorResponse(res, 'System admin access required', 403);
  }

  // Additional system admin checks could go here
  next();
};

/**
 * Log admin actions
 */
export const logAdminAction = (req, res, next) => {
  console.log(`MIDDLEWARE: logAdminAction - ${req.method} ${req.path}`);

  // Log admin action (could be stored in database)
  const actionLog = {
    adminId: req.admin?.userId || 'system',
    action: `${req.method} ${req.path}`,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString(),
    params: req.params,
    query: req.query,
    body: req.method !== 'GET' ? req.body : undefined
  };

  console.log('ADMIN_ACTION:', JSON.stringify(actionLog, null, 2));

  next();
};