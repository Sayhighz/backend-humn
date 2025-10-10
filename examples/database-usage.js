import { connectDB, closeDB } from '../config/database.config.js';
import { userModel } from '../models/user.model.js';
import { contributionModel } from '../models/contribution.model.js';
import { anthemModel } from '../models/anthem.model.js';
import { dbUtils } from '../models/index.js';

// Example usage of database functions
const demonstrateDatabaseUsage = async () => {
  console.log('🚀 Database Usage Examples\n');

  try {
    // Connect to database
    await connectDB();
    console.log('✅ Connected to database\n');

    // Example 1: User Operations
    console.log('📝 Example 1: User Operations');
    
    // Create a new user
    const newUser = await userModel.createUser({
      username: 'john_doe',
      email: 'john@example.com',
      password: 'securepassword123',
      first_name: 'John',
      last_name: 'Doe',
      country: 'US'
    });
    console.log('Created user:', newUser);

    // Find user by email
    const foundUser = await userModel.findByEmail('john@example.com');
    console.log('Found user by email:', foundUser);

    // Update user
    const updatedUser = await userModel.update(foundUser.id, {
      first_name: 'John Updated',
      last_name: 'Doe Updated'
    });
    console.log('Updated user:', updatedUser);

    // Example 2: Anthem Operations
    console.log('\n🎵 Example 2: Anthem Operations');
    
    // Create today's anthem
    const todayAnthem = await anthemModel.createAnthem({
      title: 'World Anthem - Today',
      description: 'Today\'s collaborative world anthem',
      date: new Date().toISOString().split('T')[0],
      status: 'pending'
    });
    console.log('Created anthem:', todayAnthem);

    // Get today's anthem
    const currentAnthem = await anthemModel.getTodayAnthem();
    console.log('Today\'s anthem:', currentAnthem);

    // Example 3: Contribution Operations
    console.log('\n🎤 Example 3: Contribution Operations');
    
    // Create a contribution
    const newContribution = await contributionModel.createContribution({
      user_id: foundUser.id,
      anthem_id: currentAnthem.id,
      audio_url: '/uploads/audio/user1_contribution.mp3',
      duration: 5.2,
      is_approved: null
    });
    console.log('Created contribution:', newContribution);

    // Get contributions by user
    const userContributions = await contributionModel.findByUserId(foundUser.id);
    console.log('User contributions:', userContributions);

    // Example 4: Advanced Queries
    console.log('\n🔍 Example 4: Advanced Queries');
    
    // Get contribution statistics
    const contributionStats = await contributionModel.getContributionStats();
    console.log('Contribution stats:', contributionStats);

    // Get user statistics
    const userStats = await userModel.getUserStats(foundUser.id);
    console.log('User stats:', userStats);

    // Example 5: Raw Queries with dbUtils
    console.log('\n⚡ Example 5: Raw Queries');
    
    // Custom query using dbUtils
    const customResult = await dbUtils.query(`
      SELECT 
        u.username,
        COUNT(c.id) as contribution_count
      FROM users u
      LEFT JOIN contributions c ON u.id = c.user_id
      WHERE u.is_active = true
      GROUP BY u.id, u.username
      ORDER BY contribution_count DESC
      LIMIT 5
    `);
    console.log('Top contributors:', customResult.rows);

    // Example 6: Transaction Usage
    console.log('\n💳 Example 6: Transaction Usage');
    
    const transactionResult = await dbUtils.transaction(async (client) => {
      // Update user last login
      await client.query(
        'UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1',
        [foundUser.id]
      );
      
      // Create a log entry (example)
      await client.query(
        'INSERT INTO user_activity_logs (user_id, activity, created_at) VALUES ($1, $2, $3)',
        [foundUser.id, 'login', new Date()]
      );
      
      return { success: true, message: 'Transaction completed' };
    });
    console.log('Transaction result:', transactionResult);

    // Example 7: Pagination and Filtering
    console.log('\n📄 Example 7: Pagination and Filtering');
    
    // Get users with pagination
    const paginatedUsers = await userModel.findAll({
      where: 'is_active = true',
      orderBy: 'created_at DESC',
      limit: '5',
      offset: '0'
    });
    console.log('Paginated users:', paginatedUsers);

    // Search users
    const searchResults = await userModel.searchUsers('john', 1, 5);
    console.log('Search results:', searchResults);

    console.log('\n🎉 All database examples completed successfully!');

  } catch (error) {
    console.error('❌ Error in database examples:', error.message);
  } finally {
    // Close database connection
    await closeDB();
    console.log('\n🔌 Database connection closed');
  }
};

// Run the examples
if (import.meta.url === `file://${process.argv[1]}`) {
  demonstrateDatabaseUsage()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Example execution failed:', error);
      process.exit(1);
    });
}

export default demonstrateDatabaseUsage;