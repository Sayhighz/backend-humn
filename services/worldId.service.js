import { worldIdConfig } from '../config/worldId.config.js';
import { userModel } from '../models/user.model.js';

/**
 * World ID Service
 * Handles World ID verification for both real and mock scenarios
 */
export class WorldIdService {
  /**
   * Verify World ID proof (Real verification)
   */
  async verifyProof(proofData) {
    try {
      console.log('WORLDID_SERVICE: Verifying World ID proof (REAL)');

      const { proof, merkle_root, nullifier_hash, credential_type } = proofData;

      if (!proof || !merkle_root || !nullifier_hash) {
        throw new Error('Missing required proof data');
      }

      const verifyPayload = {
        proof,
        merkle_root,
        nullifier_hash,
        credential_type: credential_type || worldIdConfig.verificationLevel,
        action: worldIdConfig.action,
        signal: proofData.signal || '',
      };

      console.log('WORLDID_SERVICE: Sending verification request to World ID API');

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
   */
  async verifyProofMock(proofData) {
    try {
      console.log('WORLDID_SERVICE: Verifying World ID proof (MOCK)');

      const { nullifier_hash, credential_type } = proofData;
      
      console.log('🔍 verifyProofMock - input nullifier_hash:', nullifier_hash);

      if (!nullifier_hash || typeof nullifier_hash !== 'string') {
        throw new Error('Invalid nullifier_hash format');
      }

      await new Promise(resolve => setTimeout(resolve, 500));

      console.log('WORLDID_SERVICE: Mock verification successful');
      
      const result = {
        success: true,
        verified: true,
        nullifier_hash,
        credential_type: credential_type || 'orb',
        verification_level: 'orb',
        mock: true,
      };
      
      console.log('🔍 verifyProofMock - output nullifier_hash:', result.nullifier_hash);
      
      return result;
    } catch (error) {
      console.error('WORLDID_SERVICE: Error in mock verification:', error);
      throw error;
    }
  }

  /**
   * Verify and create/update user
   */
  async verifyAndCreateUser(proofData, userData = {}, useMock = false) {
    try {
      console.log('🔍 verifyAndCreateUser - START');
      console.log('🔍 Input proofData:', JSON.stringify(proofData, null, 2));
      
      const verificationResult = useMock
        ? await this.verifyProofMock(proofData)
        : await this.verifyProof(proofData);

      console.log('🔍 verificationResult:', JSON.stringify(verificationResult, null, 2));

      if (!verificationResult.verified) {
        throw new Error('World ID verification failed');
      }

      console.log('🔍 Looking for existing user with nullifier_hash:', verificationResult.nullifier_hash);
      
      const existingUser = await userModel.findOne(
        'nullifier_hash = $1',
        [verificationResult.nullifier_hash]
      );

      console.log('🔍 existingUser found:', existingUser ? 'YES ✅' : 'NO ❌');
      if (existingUser) {
        console.log('🔍 existingUser data:', JSON.stringify({
          user_id: existingUser.user_id,
          nullifier_hash: existingUser.nullifier_hash,
          username: existingUser.username
        }, null, 2));
      }

      let user;

      if (existingUser) {
        console.log('WORLDID_SERVICE: User already exists, updating...');
        
        // ✅ ลบ updated_at ออก (BaseModel จะ set ให้เองอัตโนมัติ)
        user = await userModel.update(existingUser.user_id, {
          is_verified: true,
          last_active_at: new Date()
        });
        
        console.log('✅ Updated user_id:', user.user_id);
      } else {
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

        console.log('🔍 Creating user with data:', JSON.stringify(newUserData, null, 2));
        
        user = await userModel.createUser(newUserData);
        console.log('✅ Created user_id:', user.user_id);
        console.log('✅ Created nullifier_hash:', user.nullifier_hash);
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
   */
  async isNullifierUsed(nullifierHash) {
    try {
      console.log('🔍 isNullifierUsed - checking:', nullifierHash);
      
      const user = await userModel.findOne(
        'nullifier_hash = $1',
        [nullifierHash]
      );
      
      const result = !!user;
      console.log('🔍 isNullifierUsed - result:', result);
      if (user) {
        console.log('🔍 Found user:', JSON.stringify({
          user_id: user.user_id,
          nullifier_hash: user.nullifier_hash
        }, null, 2));
      }
      
      return result;
    } catch (error) {
      console.error('WORLDID_SERVICE: Error checking nullifier:', error);
      return false;
    }
  }
}

export const worldIdService = new WorldIdService();

export default worldIdService;