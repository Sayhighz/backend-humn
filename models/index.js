import { query, transaction, getClient } from '../config/database.config.js';

// Base model class with common database operations
export class BaseModel {
  constructor(tableName) {
    this.tableName = tableName;
  }

  // Find all records
  async findAll(options = {}) {
    const { where = '', orderBy = '', limit = '', offset = '' } = options;
    let queryText = `SELECT * FROM ${this.tableName}`;
    const params = [];

    if (where) {
      queryText += ` WHERE ${where}`;
    }

    if (orderBy) {
      queryText += ` ORDER BY ${orderBy}`;
    }

    if (limit) {
      queryText += ` LIMIT ${limit}`;
    }

    if (offset) {
      queryText += ` OFFSET ${offset}`;
    }

    const result = await query(queryText, params);
    return result.rows;
  }

  // Find a single record by ID
  async findById(id) {
    const queryText = `SELECT * FROM ${this.tableName} WHERE user_id = $1`;
    const result = await query(queryText, [id]);
    return result.rows[0] || null;
  }

  // Find a single record by custom condition
  async findOne(where, params) {
    const queryText = `SELECT * FROM ${this.tableName} WHERE ${where} LIMIT 1`;
    const result = await query(queryText, params);
    return result.rows[0] || null;
  }

  // Create a new record
  async create(data) {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = keys.map((_, index) => `$${index + 1}`).join(', ');

    const queryText = `
      INSERT INTO ${this.tableName} (${keys.join(', ')})
      VALUES (${placeholders})
      RETURNING *
    `;

    const result = await query(queryText, values);
    return result.rows[0];
  }

  // Update a record by ID
  async update(id, data) {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const setClause = keys.map((key, index) => `${key} = $${index + 2}`).join(', ');

    const queryText = `
      UPDATE ${this.tableName}
      SET ${setClause}, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $1
      RETURNING *
    `;

    const result = await query(queryText, [id, ...values]);
    return result.rows[0] || null;
  }

  // Delete a record by ID
  async delete(id) {
    const queryText = `DELETE FROM ${this.tableName} WHERE user_id = $1 RETURNING *`;
    const result = await query(queryText, [id]);
    return result.rows[0] || null;
  }

  // Count records
  async count(where = '', params = []) {
    let queryText = `SELECT COUNT(*) FROM ${this.tableName}`;
    
    if (where) {
      queryText += ` WHERE ${where}`;
    }

    const result = await query(queryText, params);
    return parseInt(result.rows[0].count);
  }

  // Check if record exists
  async exists(where, params) {
    const queryText = `SELECT 1 FROM ${this.tableName} WHERE ${where} LIMIT 1`;
    const result = await query(queryText, params);
    return result.rows.length > 0;
  }

  // Execute custom query
  async customQuery(queryText, params = []) {
    const result = await query(queryText, params);
    return result.rows;
  }

  // Execute with transaction
  async withTransaction(callback) {
    return await transaction(callback);
  }
}

// Database utility functions
export const dbUtils = {
  // Raw query execution
  query: async (text, params) => {
    return await query(text, params);
  },

  // Transaction execution
  transaction: async (callback) => {
    return await transaction(callback);
  },

  // Get database client
  getClient: async () => {
    return await getClient();
  },

  // Helper for building WHERE clauses
  buildWhereClause: (filters) => {
    const conditions = [];
    const params = [];
    let paramIndex = 1;

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        if (Array.isArray(value)) {
          const placeholders = value.map(() => `$${paramIndex++}`).join(', ');
          conditions.push(`${key} IN (${placeholders})`);
          params.push(...value);
        } else {
          conditions.push(`${key} = $${paramIndex++}`);
          params.push(value);
        }
      }
    });

    return {
      whereClause: conditions.length > 0 ? conditions.join(' AND ') : '',
      params
    };
  },

  // Helper for pagination
  buildPagination: (page = 1, limit = 10) => {
    const offset = (page - 1) * limit;
    return { limit, offset };
  },

  // Helper for ORDER BY clause
  buildOrderBy: (sortBy = 'user_id', sortOrder = 'ASC') => {
    return `${sortBy} ${sortOrder.toUpperCase()}`;
  }
};

export default {
  BaseModel,
  dbUtils
};