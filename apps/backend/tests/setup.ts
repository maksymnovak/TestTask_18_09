import { db } from '@/config/database';

// Global test setup
beforeAll(async () => {
  // Initialize test database connection
  await db.connect();
});

afterAll(async () => {
  // Cleanup and close database connection
  await db.disconnect();
});

// Clean up database after each test
afterEach(async () => {
  // Clean up test data in reverse order of dependencies
  await db.auditLog.deleteMany();
  await db.message.deleteMany();
  await db.notification.deleteMany();
  await db.document.deleteMany();
  await db.company.deleteMany();
  await db.user.deleteMany();
});

// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'file:./test.db';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.UPLOAD_DIR = './test-uploads';