#!/usr/bin/env tsx

import { db } from '@/config/database';
import { v4 as uuid } from 'uuid';

/**
 * Seed the database with sample data for development and testing
 */
async function seed() {
  console.log('🌱 Starting database seeding...');

  try {
    // Clear existing data
    console.log('🧹 Cleaning existing data...');
    await db.auditLog.deleteMany();
    await db.message.deleteMany();
    await db.notification.deleteMany();
    await db.document.deleteMany();
    await db.company.deleteMany();
    await db.user.deleteMany();

    // Create sample users
    console.log('👥 Creating sample users...');
    const users = [
      {
        id: uuid(),
        email: 'founder@techstartup.com',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: uuid(),
        email: 'ceo@healthtech.com',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: uuid(),
        email: 'founder@fintech.com',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    await db.user.createMany({ data: users });

    // Create sample companies
    console.log('🏢 Creating sample companies...');
    const companies = [
      {
        id: uuid(),
        userId: users[0].id,
        name: 'TechVenture AI',
        sector: 'Technology',
        targetRaise: 2000000,
        revenue: 500000,
        kycVerified: true,
        financialsLinked: true,
        createdAt: new Date('2024-01-15'),
        updatedAt: new Date(),
      },
      {
        id: uuid(),
        userId: users[1].id,
        name: 'HealthTech Solutions',
        sector: 'Healthcare',
        targetRaise: 5000000,
        revenue: 1200000,
        kycVerified: true,
        financialsLinked: false,
        createdAt: new Date('2024-02-01'),
        updatedAt: new Date(),
      },
      {
        id: uuid(),
        userId: users[2].id,
        name: 'FinanceFlow',
        sector: 'Finance',
        targetRaise: 1500000,
        revenue: 250000,
        kycVerified: false,
        financialsLinked: false,
        createdAt: new Date('2024-02-15'),
        updatedAt: new Date(),
      },
    ];

    await db.company.createMany({ data: companies });

    // Create sample documents
    console.log('📄 Creating sample documents...');
    const documents = [
      {
        id: uuid(),
        companyId: companies[0].id,
        name: 'TechVenture_PitchDeck_2024.pdf',
        mimeType: 'application/pdf',
        size: 2048576, // 2MB
        path: `/uploads/${companies[0].id}/pitch-deck.pdf`,
        category: 'pitch-deck',
        createdAt: new Date('2024-01-16'),
        updatedAt: new Date('2024-01-16'),
      },
      {
        id: uuid(),
        companyId: companies[0].id,
        name: 'Financial_Statements_Q4_2023.xlsx',
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        size: 512000, // 512KB
        path: `/uploads/${companies[0].id}/financials.xlsx`,
        category: 'financial-statements',
        createdAt: new Date('2024-01-18'),
        updatedAt: new Date('2024-01-18'),
      },
      {
        id: uuid(),
        companyId: companies[0].id,
        name: 'Business_Plan_2024.docx',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        size: 1024000, // 1MB
        path: `/uploads/${companies[0].id}/business-plan.docx`,
        category: 'business-plan',
        createdAt: new Date('2024-01-20'),
        updatedAt: new Date('2024-01-20'),
      },
      {
        id: uuid(),
        companyId: companies[1].id,
        name: 'HealthTech_Executive_Summary.pdf',
        mimeType: 'application/pdf',
        size: 1536000, // 1.5MB
        path: `/uploads/${companies[1].id}/executive-summary.pdf`,
        category: 'pitch-deck',
        createdAt: new Date('2024-02-02'),
        updatedAt: new Date('2024-02-02'),
      },
      {
        id: uuid(),
        companyId: companies[1].id,
        name: 'Clinical_Trial_Results.pdf',
        mimeType: 'application/pdf',
        size: 3072000, // 3MB
        path: `/uploads/${companies[1].id}/clinical-results.pdf`,
        category: 'other',
        createdAt: new Date('2024-02-05'),
        updatedAt: new Date('2024-02-05'),
      },
    ];

    await db.document.createMany({ data: documents });

    // Create sample notifications
    console.log('🔔 Creating sample notifications...');
    const notifications = [
      {
        id: uuid(),
        userId: users[0].id,
        type: 'success',
        title: 'Onboarding Complete',
        message: 'Welcome to Capital Marketplace! Your company "TechVenture AI" has been successfully onboarded.',
        data: JSON.stringify({ event: 'onboarding_complete', companyName: 'TechVenture AI' }),
        createdAt: new Date('2024-01-15T10:30:00Z'),
        updatedAt: new Date('2024-01-15T10:30:00Z'),
        readAt: new Date('2024-01-15T11:00:00Z'),
      },
      {
        id: uuid(),
        userId: users[0].id,
        type: 'success',
        title: 'KYC Verified',
        message: 'Your KYC verification has been completed successfully. You earned 30 investability points!',
        data: JSON.stringify({ event: 'kyc_verified', pointsEarned: 30 }),
        createdAt: new Date('2024-01-16T09:15:00Z'),
        updatedAt: new Date('2024-01-16T09:15:00Z'),
        readAt: new Date('2024-01-16T09:45:00Z'),
      },
      {
        id: uuid(),
        userId: users[0].id,
        type: 'success',
        title: 'Financials Linked',
        message: 'Your bank account has been successfully linked. You earned 20 investability points!',
        data: JSON.stringify({ event: 'financials_linked', pointsEarned: 20 }),
        createdAt: new Date('2024-01-17T14:20:00Z'),
        updatedAt: new Date('2024-01-17T14:20:00Z'),
        readAt: null, // Unread
      },
      {
        id: uuid(),
        userId: users[0].id,
        type: 'info',
        title: 'Document Uploaded',
        message: 'Document "TechVenture_PitchDeck_2024.pdf" has been uploaded successfully to your data room.',
        data: JSON.stringify({ event: 'document_uploaded', documentName: 'TechVenture_PitchDeck_2024.pdf' }),
        createdAt: new Date('2024-01-16T16:45:00Z'),
        updatedAt: new Date('2024-01-16T16:45:00Z'),
        readAt: null, // Unread
      },
      {
        id: uuid(),
        userId: users[1].id,
        type: 'success',
        title: 'Onboarding Complete',
        message: 'Welcome to Capital Marketplace! Your company "HealthTech Solutions" has been successfully onboarded.',
        data: JSON.stringify({ event: 'onboarding_complete', companyName: 'HealthTech Solutions' }),
        createdAt: new Date('2024-02-01T08:00:00Z'),
        updatedAt: new Date('2024-02-01T08:00:00Z'),
        readAt: new Date('2024-02-01T08:30:00Z'),
      },
      {
        id: uuid(),
        userId: users[2].id,
        type: 'info',
        title: 'Welcome to Capital Marketplace',
        message: 'Get started by completing your KYC verification and linking your financial accounts.',
        data: JSON.stringify({ event: 'welcome', tips: ['Complete KYC', 'Link bank account', 'Upload documents'] }),
        createdAt: new Date('2024-02-15T12:00:00Z'),
        updatedAt: new Date('2024-02-15T12:00:00Z'),
        readAt: null, // Unread
      },
    ];

    await db.notification.createMany({ data: notifications });

    // Create sample audit logs
    console.log('📊 Creating sample audit logs...');
    const auditLogs = [
      {
        id: uuid(),
        userId: users[0].id,
        action: 'company_created',
        resource: `Company:${companies[0].id}`,
        metadata: JSON.stringify({
          companyName: 'TechVenture AI',
          sector: 'Technology',
          timestamp: '2024-01-15T10:30:00Z',
        }),
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        createdAt: new Date('2024-01-15T10:30:00Z'),
      },
      {
        id: uuid(),
        userId: users[0].id,
        action: 'kyc_verified',
        resource: `Company:${companies[0].id}`,
        metadata: JSON.stringify({
          inquiryId: 'inq_ABC123',
          timestamp: '2024-01-16T09:15:00Z',
        }),
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        createdAt: new Date('2024-01-16T09:15:00Z'),
      },
      {
        id: uuid(),
        userId: users[0].id,
        action: 'financials_linked',
        resource: `Company:${companies[0].id}`,
        metadata: JSON.stringify({
          plaidToken: '[REDACTED]',
          timestamp: '2024-01-17T14:20:00Z',
        }),
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        createdAt: new Date('2024-01-17T14:20:00Z'),
      },
    ];

    await db.auditLog.createMany({ data: auditLogs });

    console.log('✅ Database seeding completed successfully!');

    // Print summary
    console.log(`
📈 Seeding Summary:
   • Users: ${users.length}
   • Companies: ${companies.length}
   • Documents: ${documents.length}
   • Notifications: ${notifications.length}
   • Audit Logs: ${auditLogs.length}

🎯 Sample Data Created:
   • TechVenture AI (fully onboarded, score: ~80)
   • HealthTech Solutions (partially onboarded, score: ~55)
   • FinanceFlow (new company, score: ~25)

🔐 Test Credentials:
   • founder@techstartup.com (TechVenture AI)
   • ceo@healthtech.com (HealthTech Solutions)
   • founder@fintech.com (FinanceFlow)
    `);

  } catch (error) {
    console.error('❌ Seeding failed:', error);
    throw error;
  } finally {
    await db.disconnect();
  }
}

// Run seeding if this file is executed directly
if (require.main === module) {
  seed()
    .then(() => {
      console.log('🎉 Seeding completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Seeding failed:', error);
      process.exit(1);
    });
}

export { seed };