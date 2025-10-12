import { storageService } from './storage.service.js';
import { aiService } from './ai.service.js';

/**
 * Audio Service
 * Handles audio processing, validation, and storage operations
 */
export class AudioService {
  constructor() {
    this.supportedFormats = ['mp3', 'wav', 'm4a', 'webm'];
    this.maxFileSize = 10 * 1024 * 1024; // 10MB
    this.minDuration = 3000; // 3 seconds
    this.maxDuration = 8000; // 8 seconds
  }

  /**
   * Process uploaded audio file
   * @param {Object} file - Uploaded file object
   * @param {Object} metadata - Additional metadata
   * @returns {Promise<Object>} Processed audio data
   */
  async processAudioFile(file, metadata = {}) {
    try {
      console.log('AUDIO_SERVICE: Processing audio file:', file.originalname);

      // Validate file
      await this.validateAudioFile(file);

      // Analyze audio quality
      const qualityAnalysis = await aiService.analyzeAudioQuality(file.buffer);

      // Extract audio metadata
      const audioMetadata = await this.extractAudioMetadata(file.buffer);

      // Generate storage key
      const storageKey = this.generateStorageKey(metadata.userId, metadata.date);

      // Upload to storage
      const uploadResult = await storageService.uploadAudio(file.buffer, storageKey);

      const processedData = {
        audioUrl: uploadResult.url,
        audioFormat: this.getFileExtension(file.originalname),
        durationMs: audioMetadata.duration,
        fileSizeBytes: file.size,
        quality: qualityAnalysis,
        metadata: {
          ...audioMetadata,
          uploadedAt: new Date().toISOString(),
          ...metadata
        }
      };

      console.log('AUDIO_SERVICE: Audio file processed successfully');
      return processedData;

    } catch (error) {
      console.error('AUDIO_SERVICE: Error processing audio file:', error);
      throw error;
    }
  }

  /**
   * Validate audio file
   * @param {Object} file - File object
   */
  async validateAudioFile(file) {
    // Check file size
    if (file.size > this.maxFileSize) {
      throw new Error(`File size exceeds maximum limit of ${this.maxFileSize / (1024 * 1024)}MB`);
    }

    // Check file format
    const extension = this.getFileExtension(file.originalname);
    if (!this.supportedFormats.includes(extension)) {
      throw new Error(`Unsupported audio format: ${extension}. Supported formats: ${this.supportedFormats.join(', ')}`);
    }

    // Basic audio validation (would use a library like ffmpeg in production)
    if (!file.buffer || file.buffer.length === 0) {
      throw new Error('Invalid audio file: empty or corrupted');
    }
  }

  /**
   * Extract audio metadata
   * @param {Buffer} buffer - Audio buffer
   * @returns {Promise<Object>} Audio metadata
   */
  async extractAudioMetadata(buffer) {
    // Mock metadata extraction - in production, use ffmpeg or similar
    const metadata = {
      duration: Math.floor(Math.random() * (this.maxDuration - this.minDuration) + this.minDuration),
      sampleRate: 44100,
      channels: 1,
      bitrate: 128000,
      format: 'mp3'
    };

    // Validate duration
    if (metadata.duration < this.minDuration || metadata.duration > this.maxDuration) {
      throw new Error(`Audio duration must be between ${this.minDuration/1000} and ${this.maxDuration/1000} seconds`);
    }

    return metadata;
  }

  /**
   * Generate storage key for audio file
   * @param {string} userId - User ID
   * @param {string} date - Date string
   * @returns {string} Storage key
   */
  generateStorageKey(userId, date) {
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substr(2, 9);
    return `contributions/${date}/${userId}/${timestamp}_${randomId}.mp3`;
  }

  /**
   * Get file extension
   * @param {string} filename - Filename
   * @returns {string} File extension
   */
  getFileExtension(filename) {
    return filename.split('.').pop().toLowerCase();
  }

  /**
   * Convert audio format
   * @param {Buffer} buffer - Audio buffer
   * @param {string} fromFormat - Source format
   * @param {string} toFormat - Target format
   * @returns {Promise<Buffer>} Converted audio buffer
   */
  async convertAudioFormat(buffer, fromFormat, toFormat) {
    try {
      console.log(`AUDIO_SERVICE: Converting audio from ${fromFormat} to ${toFormat}`);

      // Mock conversion - in production, use ffmpeg
      // For now, just return the original buffer
      return buffer;

    } catch (error) {
      console.error('AUDIO_SERVICE: Error converting audio format:', error);
      throw error;
    }
  }

  /**
   * Normalize audio levels
   * @param {Buffer} buffer - Audio buffer
   * @returns {Promise<Buffer>} Normalized audio buffer
   */
  async normalizeAudio(buffer) {
    try {
      console.log('AUDIO_SERVICE: Normalizing audio levels');

      // Mock normalization - in production, use audio processing library
      return buffer;

    } catch (error) {
      console.error('AUDIO_SERVICE: Error normalizing audio:', error);
      throw error;
    }
  }

  /**
   * Trim silence from audio
   * @param {Buffer} buffer - Audio buffer
   * @returns {Promise<Object>} Trimmed audio data
   */
  async trimSilence(buffer) {
    try {
      console.log('AUDIO_SERVICE: Trimming silence from audio');

      // Mock silence trimming - in production, use audio analysis library
      return {
        buffer: buffer,
        originalDuration: 5000,
        trimmedDuration: 4800,
        silenceRemoved: 200
      };

    } catch (error) {
      console.error('AUDIO_SERVICE: Error trimming silence:', error);
      throw error;
    }
  }

  /**
   * Merge multiple audio files
   * @param {Array<Buffer>} buffers - Audio buffers to merge
   * @returns {Promise<Buffer>} Merged audio buffer
   */
  async mergeAudioFiles(buffers) {
    try {
      console.log(`AUDIO_SERVICE: Merging ${buffers.length} audio files`);

      // Mock merging - in production, use audio processing library
      // For now, return the first buffer
      return buffers[0] || Buffer.from('');

    } catch (error) {
      console.error('AUDIO_SERVICE: Error merging audio files:', error);
      throw error;
    }
  }

  /**
   * Generate audio preview
   * @param {Buffer} buffer - Audio buffer
   * @param {number} duration - Preview duration in seconds
   * @returns {Promise<Buffer>} Preview audio buffer
   */
  async generatePreview(buffer, duration = 10) {
    try {
      console.log(`AUDIO_SERVICE: Generating ${duration}s preview`);

      // Mock preview generation - in production, extract first N seconds
      return buffer.slice(0, Math.min(buffer.length, 102400)); // First ~100KB

    } catch (error) {
      console.error('AUDIO_SERVICE: Error generating preview:', error);
      throw error;
    }
  }

  /**
   * Get audio waveform data
   * @param {Buffer} buffer - Audio buffer
   * @param {number} samples - Number of samples
   * @returns {Promise<Array<number>>} Waveform data
   */
  async getWaveformData(buffer, samples = 100) {
    try {
      console.log(`AUDIO_SERVICE: Generating waveform data with ${samples} samples`);

      // Mock waveform generation - in production, analyze audio samples
      const waveform = [];
      for (let i = 0; i < samples; i++) {
        waveform.push(Math.random() * 2 - 1); // Random values between -1 and 1
      }

      return waveform;

    } catch (error) {
      console.error('AUDIO_SERVICE: Error generating waveform data:', error);
      throw error;
    }
  }

  /**
   * Clean up temporary audio files
   * @param {Array<string>} filePaths - File paths to clean up
   */
  async cleanupTempFiles(filePaths) {
    try {
      console.log(`AUDIO_SERVICE: Cleaning up ${filePaths.length} temporary files`);

      // In production, delete files from temp storage
      // For now, just log
      filePaths.forEach(path => {
        console.log(`Would delete temp file: ${path}`);
      });

    } catch (error) {
      console.error('AUDIO_SERVICE: Error cleaning up temp files:', error);
      // Don't throw - cleanup failure shouldn't break main flow
    }
  }
}

// Create and export audio service instance
export const audioService = new AudioService();

export default audioService;