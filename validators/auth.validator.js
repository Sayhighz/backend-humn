/**
 * Authentication Validators
 */

export const validateMockLogin = (req, res, next) => {
  console.log('VALIDATOR: validateMockLogin');

  const { username, email, first_name, last_name, country } = req.body;
  const errors = [];

  if (username && (typeof username !== 'string' || username.length < 3 || username.length > 100)) {
    errors.push('Username must be a string between 3 and 100 characters');
  }

  if (email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (typeof email !== 'string' || !emailRegex.test(email)) {
      errors.push('Invalid email format');
    }
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

export const validateWorldIdVerify = (req, res, next) => {
  console.log('VALIDATOR: validateWorldIdVerify (REAL)');

  const { proof, merkle_root, nullifier_hash, credential_type } = req.body;
  const errors = [];

  if (!proof || typeof proof !== 'string') {
    errors.push('proof is required and must be a string');
  }

  if (!merkle_root || typeof merkle_root !== 'string') {
    errors.push('merkle_root is required and must be a string');
  }

  if (!nullifier_hash || typeof nullifier_hash !== 'string') {
    errors.push('nullifier_hash is required and must be a string');
  }

  if (credential_type && !['orb', 'device'].includes(credential_type)) {
    errors.push('credential_type must be either "orb" or "device"');
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

export const validateWorldIdVerifyMock = (req, res, next) => {
  console.log('VALIDATOR: validateWorldIdVerifyMock (MOCK)');

  const { nullifier_hash } = req.body;
  const errors = [];

  if (!nullifier_hash || typeof nullifier_hash !== 'string' || nullifier_hash.length < 10) {
    errors.push('nullifier_hash is required and must be a string with at least 10 characters');
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
 * Token refresh validation - แก้ไขให้รับ refreshToken
 */
export const validateTokenRefresh = (req, res, next) => {
  console.log('VALIDATOR: validateTokenRefresh');

  const { refreshToken } = req.body;
  const errors = [];

  if (!refreshToken || typeof refreshToken !== 'string' || refreshToken.trim().length === 0) {
    errors.push('refreshToken is required and must be a valid string');
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