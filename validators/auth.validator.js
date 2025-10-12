/**
 * Authentication Validators
 * Validation rules for authentication-related requests
 */

/**
 * Mock login validation
 * Validates request body for mock login endpoint
 */
export const validateMockLogin = (req, res, next) => {
  console.log('VALIDATOR: validateMockLogin');

  const { username, email, first_name, last_name, country } = req.body;

  const errors = [];

  // Username validation (optional)
  if (username && (typeof username !== 'string' || username.length < 3 || username.length > 100)) {
    errors.push('Username must be a string between 3 and 100 characters');
  }

  // Email validation (optional)
  if (email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (typeof email !== 'string' || !emailRegex.test(email)) {
      errors.push('Invalid email format');
    }
  }

  // First name validation (optional)
  if (first_name && (typeof first_name !== 'string' || first_name.length < 1 || first_name.length > 100)) {
    errors.push('First name must be a string between 1 and 100 characters');
  }

  // Last name validation (optional)
  if (last_name && (typeof last_name !== 'string' || last_name.length < 1 || last_name.length > 100)) {
    errors.push('Last name must be a string between 1 and 100 characters');
  }

  // Country validation (optional)
  if (country && (typeof country !== 'string' || country.length !== 2)) {
    errors.push('Country must be a 2-letter country code');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors
    });
  }

  next();
};

/**
 * Token refresh validation
 * Validates request body for token refresh endpoint
 */
export const validateTokenRefresh = (req, res, next) => {
  console.log('VALIDATOR: validateTokenRefresh');

  const { token } = req.body;

  const errors = [];

  if (!token || typeof token !== 'string' || token.trim().length === 0) {
    errors.push('Valid token is required');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors
    });
  }

  next();
};

/**
 * Logout validation
 * Validates logout request (mainly checks for authorization header)
 */
export const validateLogout = (req, res, next) => {
  console.log('VALIDATOR: validateLogout');

  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(400).json({
      success: false,
      message: 'Authorization header with Bearer token required'
    });
  }

  const token = authHeader.split(' ')[1];

  if (!token || token.trim().length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Valid token required in Authorization header'
    });
  }

  next();
};