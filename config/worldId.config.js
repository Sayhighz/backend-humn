/**
 * World ID Configuration
 */

export const worldIdConfig = {
  // World ID App credentials
  appId: process.env.WORLDID_APP_ID || 'app_staging_12345',
  action: process.env.WORLDID_ACTION || 'verify-human',
  
  // API endpoint
  verifyEndpoint: process.env.WORLDID_VERIFY_ENDPOINT || 'https://developer.worldcoin.org/api/v1/verify',
  
  // Environment
  environment: process.env.NODE_ENV || 'development',
  
  // Mock settings for development
  enableMock: process.env.WORLDID_ENABLE_MOCK === 'true' || process.env.NODE_ENV === 'development',
  
  // Verification settings
  verificationLevel: process.env.WORLDID_VERIFICATION_LEVEL || 'orb', // 'orb' or 'device'
};

export default worldIdConfig;