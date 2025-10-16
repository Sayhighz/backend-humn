import { BaseModel, dbUtils } from './index.js';
import bcrypt from 'bcrypt';

export class User extends BaseModel {
  constructor() {
    super('users');
  }

  // Find user by email
  async findByEmail(email) {
    return await this.findOne('email = $1', [email]);
  }

  // Find user by username
  async findByUsername(username) {
    return await this.findOne('username = $1', [username]);
  }

  // Create new user with password hashing
  async createUser(userData) {
    console.log('🔍 USER_MODEL: createUser - input userData:', JSON.stringify(userData, null, 2));
    
    const { password, ...otherData } = userData;

    // For mock authentication, password is optional
    let hashedPassword = null;
    if (password) {
      // Hash password
      const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
      hashedPassword = await bcrypt.hash(password, saltRounds);
    }

    // ✅ ใช้ค่าที่ส่งมา ถ้าไม่มีค่าถึงจะสร้างใหม่
    const userToCreate = {
      username: otherData.username,
      email: otherData.email,
      country_code: otherData.country_code,
      // ✅ ใช้ค่าที่ส่งมา หรือสร้างใหม่ถ้าไม่มี
      world_id: otherData.world_id || `mock-world-id-${Date.now()}`,
      nullifier_hash: otherData.nullifier_hash || `mock-hash-${Date.now()}`,
      is_verified: otherData.is_verified !== undefined ? otherData.is_verified : true,
      is_active: otherData.is_active !== undefined ? otherData.is_active : true,
      created_at: new Date(),
      updated_at: new Date(),
      last_active_at: new Date()
    };

    console.log('🔍 USER_MODEL: createUser - userToCreate:', JSON.stringify(userToCreate, null, 2));

    const createdUser = await this.create(userToCreate);
    
    console.log('🔍 USER_MODEL: createUser - created user:', JSON.stringify({
      user_id: createdUser.user_id,
      nullifier_hash: createdUser.nullifier_hash,
      world_id: createdUser.world_id
    }, null, 2));
    
    return createdUser;
  }

  // Verify user password (removed - password column doesn't exist)
  async verifyPassword(user, password) {
    // Password verification removed as password column doesn't exist in database
    return false;
  }

  // Update user password (removed - password column doesn't exist)
  async updatePassword(userId, newPassword) {
    // Password functionality removed as password column doesn't exist in database
    throw new Error('Password update not supported - password column does not exist');
  }

  // Get user with profile information
  async getUserProfile(userId) {
    const queryText = `
      SELECT
        user_id, username, email, country_code, is_verified, is_active,
        avatar_url, created_at, updated_at, last_active_at
      FROM ${this.tableName}
      WHERE user_id = $1 AND is_active = true
    `;

    const result = await dbUtils.query(queryText, [userId]);
    return result.rows[0] || null;
  }

  // Update last login timestamp
  async updateLastLogin(userId) {
    const queryText = `
      UPDATE ${this.tableName}
      SET last_active_at = CURRENT_TIMESTAMP
      WHERE user_id = $1
      RETURNING user_id, last_active_at
    `;

    const result = await dbUtils.query(queryText, [userId]);
    return result.rows[0] || null;
  }

  // Get active users with pagination
  async getActiveUsers(page = 1, limit = 10) {
    const { limit: limitValue, offset } = dbUtils.buildPagination(page, limit);

    const queryText = `
      SELECT user_id, username, email, avatar_url, country_code, is_verified, created_at
      FROM ${this.tableName}
      WHERE is_active = true
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
    `;

    const result = await dbUtils.query(queryText, [limitValue, offset]);
    return result.rows;
  }

  // Search users by name or username
  async searchUsers(searchTerm, page = 1, limit = 10) {
    const { limit: limitValue, offset } = dbUtils.buildPagination(page, limit);

    const queryText = `
      SELECT user_id, username, email, avatar_url, country_code, is_verified
      FROM ${this.tableName}
      WHERE is_active = true
        AND (username ILIKE $1 OR email ILIKE $1)
      ORDER BY username ASC
      LIMIT $2 OFFSET $3
    `;

    const result = await dbUtils.query(queryText, [`%${searchTerm}%`, limitValue, offset]);
    return result.rows;
  }

  // Deactivate user (soft delete)
  async deactivateUser(userId) {
    return await this.update(userId, { 
      is_active: false,
      updated_at: new Date()
    });
  }

  // Get user statistics
  async getUserStats(userId) {
    const queryText = `
      SELECT
        u.user_id,
        u.username,
        u.created_at,
        COUNT(DISTINCT c.id) as total_contributions,
        COUNT(DISTINCT CASE WHEN c.created_at >= CURRENT_DATE - INTERVAL '30 days' THEN c.id END) as recent_contributions,
        MAX(c.created_at) as last_contribution_at
      FROM users u
      LEFT JOIN contributions c ON u.user_id = c.user_id
      WHERE u.user_id = $1 AND u.is_active = true
      GROUP BY u.user_id, u.username, u.created_at
    `;

    const result = await dbUtils.query(queryText, [userId]);
    return result.rows[0] || null;
  }
}

// Create and export user model instance
export const userModel = new User();

export default userModel;