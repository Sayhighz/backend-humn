/**
 * AI Configuration
 * Configuration for AI services and models
 */

export const aiConfig = {
  // AI Model Configuration
  model: process.env.AI_MODEL || 'openai/whisper-large-v3',
  apiKey: process.env.AI_API_KEY,
  apiUrl: process.env.AI_API_URL || 'https://api.openai.com/v1',

  // Processing Configuration
  maxConcurrentJobs: parseInt(process.env.AI_MAX_CONCURRENT_JOBS) || 5,
  processingTimeout: parseInt(process.env.AI_PROCESSING_TIMEOUT) || 300000, // 5 minutes
  retryAttempts: parseInt(process.env.AI_RETRY_ATTEMPTS) || 3,

  // Audio Configuration
  supportedFormats: ['mp3', 'wav', 'm4a', 'webm'],
  maxFileSize: parseInt(process.env.AI_MAX_FILE_SIZE) || 10485760, // 10MB
  targetSampleRate: 16000,
  channels: 1, // Mono

  // Quality Thresholds
  minQualityScore: parseFloat(process.env.AI_MIN_QUALITY_SCORE) || 0.6,
  minDuration: 3000, // 3 seconds
  maxDuration: 8000, // 8 seconds

  // Anthem Generation
  anthemModel: process.env.AI_ANTHEM_MODEL || 'stabilityai/stable-audio-open-1.0',
  anthemMaxDuration: 300000, // 5 minutes
  anthemFadeDuration: 2000, // 2 seconds fade in/out

  // Cost Limits
  maxMonthlyCost: parseFloat(process.env.AI_MAX_MONTHLY_COST) || 1000,
  costPerMinute: parseFloat(process.env.AI_COST_PER_MINUTE) || 0.002
};

export default aiConfig;