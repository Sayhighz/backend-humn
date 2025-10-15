import { worldIdConfig } from '../config/worldId.config.js';
import { userModel } from '../models/user.model.js';

/**
 * World ID Service
 * Handles World ID verification for both real and mock scenarios
 */
export class WorldIdService {
  /**
   * Verify World ID proof (Real verification)
   * @param {Object} proofData - World ID proof data
   * @returns {Promise<Object>} Verification result
   */
  async verifyProof(proofData) {
    try {
      console.log('WORLDID_SERVICE: Verifying World ID proof (REAL)');

      const { proof, merkle_root, nullifier_hash, credential_type } = proofData;

      // Validate required fields
      if (!proof || !merkle_root || !nullifier_hash) {
        throw new Error('Missing required proof data');
      }

      // Prepare verification request
      const verifyPayload = {
        proof,
        merkle_root,
        nullifier_hash,
        credential_type: credential_type || worldIdConfig.verificationLevel,
        action: worldIdConfig.action,
        signal: proofData.signal || '',
      };

      console.log('WORLDID_SERVICE: Sending verification request to World ID API');

      // Call World ID verification API
      const response = await fetch(
        `${worldIdConfig.verifyEndpoint}/${worldIdConfig.appId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(verifyPayload),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        console.error('WORLDID_SERVICE: Verification failed:', result);
        throw new Error(result.detail || 'World ID verification failed');
      }

      if (!result.success) {
        throw new Error('World ID verification returned unsuccessful');
      }

      console.log('WORLDID_SERVICE: Verification successful');

      return {
        success: true,
        verified: true,
        nullifier_hash,
        credential_type: result.credential_type || credential_type,
        verification_level: result.verification_level,
      };
    } catch (error) {
      console.error('WORLDID_SERVICE: Error verifying proof:', error);
      throw error;
    }
  }

  /**
   * Mock World ID verification (Development only)
   * @param {Object} proofData - Mock proof data
   * @returns {Promise<Object>} Mock verification result
   */
  async verifyProofMock(proofData) {
    try {
      console.log('WORLDID_SERVICE: Verifying World ID proof (MOCK)');

      const { nullifier_hash, credential_type } = proofData;

      // Validate nullifier hash format (basic check)
      if (!nullifier_hash || typeof nullifier_hash !== 'string') {
        throw new Error('Invalid nullifier_hash format');
      }

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));

      // Mock verification always succeeds in dev mode
      console.log('WORLDID_SERVICE: Mock verification successful');

      return {
        success: true,
        verified: true,
        nullifier_hash,
        credential_type: credential_type || 'orb',
        verification_level: 'orb',
        mock: true,
      };
    } catch (error) {
      console.error('WORLDID_SERVICE: Error in mock verification:', error);
      throw error;
    }
  }

  /**
   * Verify and create/update user
   * @param {Object} proofData - World ID proof data
   * @param {Object} userData - Additional user data
   * @param {boolean} useMock - Whether to use mock verification
   * @returns {Promise<Object>} User and verification result
   */
  async verifyAndCreateUser(proofData, userData = {}, useMock = false) {
    try {
      // Verify proof (real or mock)
      const verificationResult = useMock
        ? await this.verifyProofMock(proofData)
        : await this.verifyProof(proofData);

      if (!verificationResult.verified) {
        throw new Error('World ID verification failed');
      }

      // Check if user already exists with this nullifier_hash
      const existingUser = await userModel.findOne(
        'nullifier_hash = $1',
        [verificationResult.nullifier_hash]
      );

      let user;

      if (existingUser) {
        // Update existing user
        console.log('WORLDID_SERVICE: User already exists, updating...');
        user = await userModel.update(existingUser.user_id, {
          is_verified: true,
          last_active_at: new Date(),
          updated_at: new Date(),
        });
      } else {
        // Create new user
        console.log('WORLDID_SERVICE: Creating new user...');
        
        const newUserData = {
          world_id: `world_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          nullifier_hash: verificationResult.nullifier_hash,
          username: userData.username || `user_${Date.now()}`,
          email: userData.email || `user_${Date.now()}@worldid.verified`,
          country_code: userData.country_code || 'US',
          is_verified: true,
          is_active: true,
        };

        user = await userModel.createUser(newUserData);
      }

      return {
        user: {
          user_id: user.user_id,
          world_id: user.world_id,
          username: user.username,
          email: user.email,
          country_code: user.country_code,
          is_verified: user.is_verified,
          created_at: user.created_at,
        },
        verification: {
          ...verificationResult,
          verified_at: new Date().toISOString(),
        },
      };
    } catch (error) {
      console.error('WORLDID_SERVICE: Error in verifyAndCreateUser:', error);
      throw error;
    }
  }

  /**
   * Check if nullifier hash is already used
   * @param {string} nullifierHash - Nullifier hash to check
   * @returns {Promise<boolean>} Whether hash is used
   */
  async isNullifierUsed(nullifierHash) {
    try {
      const user = await userModel.findOne(
        'nullifier_hash = $1',
        [nullifierHash]
      );
      return !!user;
    } catch (error) {
      console.error('WORLDID_SERVICE: Error checking nullifier:', error);
      return false;
    }
  }
}

// Create and export World ID service instance
export const worldIdService = new WorldIdService();

export default worldIdService;