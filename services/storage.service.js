import crypto from 'crypto';

/**
 * Storage Service
 * Handles file storage operations and temporary URL generation
 */
export class StorageService {
  constructor() {
    // In a real implementation, this would connect to cloud storage like AWS S3, Google Cloud Storage, etc.
    // For now, we'll simulate the functionality
    this.baseUrl = process.env.STORAGE_BASE_URL || 'https://storage.humn.app';
    this.bucket = process.env.STORAGE_BUCKET || 'humn-anthems';
  }

  /**
   * Generate a temporary download URL for an anthem
   * @param {string} anthemId - Anthem ID
   * @param {string} fileName - Original file name
   * @param {number} expiresInHours - Hours until expiration (default: 24)
   * @returns {Object} URL and expiration info
   */
  generateDownloadUrl(anthemId, fileName, expiresInHours = 24) {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expiresInHours);

    // Create a simple signed URL (in production, use proper signing)
    const signature = this.generateSignature(anthemId, expiresAt);
    const url = `${this.baseUrl}/${this.bucket}/anthems/${anthemId}/${fileName}?signature=${signature}&expires=${expiresAt.toISOString()}`;

    return {
      url,
      expiresAt: expiresAt.toISOString()
    };
  }

  /**
   * Generate a signature for URL security
   * @param {string} anthemId - Anthem ID
   * @param {Date} expiresAt - Expiration date
   * @returns {string} Signature
   */
  generateSignature(anthemId, expiresAt) {
    const secret = process.env.STORAGE_SECRET_KEY || 'default-secret-key';
    const data = `${anthemId}:${expiresAt.getTime()}`;
    return crypto.createHmac('sha256', secret).update(data).digest('hex');
  }

  /**
   * Validate a signed URL
   * @param {string} url - The signed URL
   * @returns {boolean} Whether the URL is valid
   */
  validateDownloadUrl(url) {
    try {
      const urlObj = new URL(url);
      const signature = urlObj.searchParams.get('signature');
      const expires = urlObj.searchParams.get('expires');

      if (!signature || !expires) return false;

      const expiresAt = new Date(expires);
      if (expiresAt < new Date()) return false;

      // Extract anthem ID from path
      const pathParts = urlObj.pathname.split('/');
      const anthemId = pathParts[pathParts.length - 2]; // Assuming /bucket/anthems/anthemId/filename

      const expectedSignature = this.generateSignature(anthemId, expiresAt);
      return crypto.timingSafeEqual(
        Buffer.from(signature, 'hex'),
        Buffer.from(expectedSignature, 'hex')
      );
    } catch (error) {
      return false;
    }
  }

  /**
   * Get file metadata
   * @param {string} anthemId - Anthem ID
   * @returns {Object} File metadata
   */
  async getFileMetadata(anthemId) {
    // In a real implementation, this would query the storage service
    // For now, return mock data
    return {
      size: 5242880, // 5MB
      contentType: 'audio/mpeg',
      lastModified: new Date().toISOString()
    };
  }

  /**
   * Check if file exists
   * @param {string} anthemId - Anthem ID
   * @param {string} fileName - File name
   * @returns {boolean} Whether file exists
   */
  async fileExists(anthemId, fileName) {
    // In a real implementation, this would check the storage service
    // For now, assume files exist if anthem is completed
    return true;
  }

  /**
   * Upload audio file to storage
   * @param {Buffer} buffer - Audio buffer
   * @param {string} key - Storage key
   * @returns {Promise<Object>} Upload result
   */
  async uploadAudio(buffer, key) {
    try {
      console.log(`STORAGE_SERVICE: Uploading audio file: ${key}`);

      // In a real implementation, this would upload to cloud storage
      // For now, simulate upload
      const url = `${this.baseUrl}/${this.bucket}/${key}`;

      return {
        url,
        key,
        size: buffer.length,
        uploadedAt: new Date().toISOString()
      };

    } catch (error) {
      console.error('STORAGE_SERVICE: Error uploading audio:', error);
      throw error;
    }
  }

  /**
   * Delete audio file from storage
   * @param {string} key - Storage key
   * @returns {Promise<boolean>} Success status
   */
  async deleteAudio(key) {
    try {
      console.log(`STORAGE_SERVICE: Deleting audio file: ${key}`);

      // In a real implementation, this would delete from cloud storage
      // For now, simulate deletion
      return true;

    } catch (error) {
      console.error('STORAGE_SERVICE: Error deleting audio:', error);
      throw error;
    }
  }

  /**
   * Get audio file URL
   * @param {string} key - Storage key
   * @param {number} expiresIn - Expiration time in seconds
   * @returns {string} Signed URL
   */
  getAudioUrl(key, expiresIn = 3600) {
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + expiresIn);

    const signature = this.generateSignature(key, expiresAt);
    return `${this.baseUrl}/${this.bucket}/${key}?signature=${signature}&expires=${expiresAt.toISOString()}`;
  }

  /**
   * Generate signature for storage key
   * @param {string} key - Storage key
   * @param {Date} expiresAt - Expiration date
   * @returns {string} Signature
   */
  generateSignature(key, expiresAt) {
    const secret = process.env.STORAGE_SECRET_KEY || 'default-secret-key';
    const data = `${key}:${expiresAt.getTime()}`;
    return crypto.createHmac('sha256', secret).update(data).digest('hex');
  }
}

// Export singleton instance
export const storageService = new StorageService();