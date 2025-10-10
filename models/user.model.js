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
    const { password, ...otherData } = userData;
    
    // Hash password
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    const userToCreate = {
      ...otherData,
      password: hashedPassword,
      created_at: new Date(),
      updated_at: new Date()
    };

    return await this.create(userToCreate);
  }

  // Verify user password
  async verifyPassword(user, password) {
    return await bcrypt.compare(password, user.password);
  }

  // Update user password
  async updatePassword(userId, newPassword) {
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
    
    return await this.update(userId, { 
      password: hashedPassword,
      updated_at: new Date()
    });
  }

  // Get user with profile information
  async getUserProfile(userId) {
    const queryText = `
      SELECT 
        id, username, email, first_name, last_name, 
        avatar_url, country, is_verified, is_active,
        created_at, updated_at, last_login_at
      FROM ${this.tableName}
      WHERE id = $1 AND is_active = true
    `;
    
    const result = await dbUtils.query(queryText, [userId]);
    return result.rows[0] || null;
  }

  // Update last login timestamp
  async updateLastLogin(userId) {
    const queryText = `
      UPDATE ${this.tableName}
      SET last_login_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id, last_login_at
    `;
    
    const result = await dbUtils.query(queryText, [userId]);
    return result.rows[0] || null;
  }

  // Get active users with pagination
  async getActiveUsers(page = 1, limit = 10) {
    const { limit: limitValue, offset } = dbUtils.buildPagination(page, limit);
    
    const queryText = `
      SELECT id, username, email, first_name, last_name, 
             avatar_url, country, is_verified, created_at
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
      SELECT id, username, email, first_name, last_name, 
             avatar_url, country, is_verified
      FROM ${this.tableName}
      WHERE is_active = true
        AND (username ILIKE $1 OR first_name ILIKE $1 OR last_name ILIKE $1)
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
        u.id,
        u.username,
        u.created_at,
        COUNT(DISTINCT c.id) as total_contributions,
        COUNT(DISTINCT CASE WHEN c.created_at >= CURRENT_DATE - INTERVAL '30 days' THEN c.id END) as recent_contributions,
        MAX(c.created_at) as last_contribution_at
      FROM users u
      LEFT JOIN contributions c ON u.id = c.user_id
      WHERE u.id = $1 AND u.is_active = true
      GROUP BY u.id, u.username, u.created_at
    `;
    
    const result = await dbUtils.query(queryText, [userId]);
    return result.rows[0] || null;
  }
}

// Create and export user model instance
export const userModel = new User();

export default userModel;