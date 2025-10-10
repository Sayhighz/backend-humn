import { connectDB, testConnection } from '../config/database.config.js';

console.log('Testing database connection...');

try {
  const connected = await connectDB();
  console.log('Connection result:', connected);
  
  if (connected) {
    const testResult = await testConnection();
    console.log('Test result:', testResult);
  }
} catch (error) {
  console.error('Error:', error.message);
}