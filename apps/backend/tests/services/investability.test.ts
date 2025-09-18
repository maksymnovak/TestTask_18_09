import { InvestabilityService } from '@/services/investability';
import { db } from '@/config/database';
import { v4 as uuid } from 'uuid';

describe('InvestabilityService', () => {
  let userId: string;
  let companyId: string;

  beforeEach(async () => {
    // Create test user
    userId = uuid();
    await db.user.create({
      data: {
        id: userId,
        email: 'test@investability.com',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // Create test company
    companyId = uuid();
    await db.company.create({
      data: {
        id: companyId,
        userId,
        name: 'Test Company',
        sector: 'Technology',
        targetRaise: 1000000,
        revenue: 500000,
        kycVerified: false,
        financialsLinked: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
  });

  describe('calculateScore', () => {
    it('should calculate base score for new company', async () => {
      const score = await InvestabilityService.calculateScore(companyId);

      expect(score.score).toBe(13); // Only revenue score: 500k/1M * 25 = 12.5 rounded to 13
      expect(score.breakdown).toEqual({
        kycVerified: 0,
        financialsLinked: 0,
        documentsUploaded: 0,
        revenueScore: 13,
      });
    });

    it('should calculate score with KYC verified', async () => {
      // Update company to KYC verified
      await db.company.update({
        where: { id: companyId },
        data: { kycVerified: true },
      });

      const score = await InvestabilityService.calculateScore(companyId);

      expect(score.score).toBe(43); // 30 (KYC) + 13 (revenue)
      expect(score.breakdown.kycVerified).toBe(30);
    });

    it('should calculate score with financials linked', async () => {
      // Update company to have financials linked
      await db.company.update({
        where: { id: companyId },
        data: { financialsLinked: true },
      });

      const score = await InvestabilityService.calculateScore(companyId);

      expect(score.score).toBe(33); // 20 (financials) + 13 (revenue)
      expect(score.breakdown.financialsLinked).toBe(20);
    });

    it('should calculate score with documents uploaded', async () => {
      // Add test documents
      const documents = Array.from({ length: 3 }, (_, i) => ({
        id: uuid(),
        companyId,
        name: `Document ${i + 1}.pdf`,
        mimeType: 'application/pdf',
        size: 1024000,
        path: `/uploads/${companyId}/doc${i + 1}.pdf`,
        category: 'other',
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      await db.document.createMany({ data: documents });

      const score = await InvestabilityService.calculateScore(companyId);

      expect(score.score).toBe(28); // 15 (3 docs * 5) + 13 (revenue)
      expect(score.breakdown.documentsUploaded).toBe(15);
    });

    it('should cap document score at 25 points', async () => {
      // Add 6 documents (should cap at 5 * 5 = 25 points)
      const documents = Array.from({ length: 6 }, (_, i) => ({
        id: uuid(),
        companyId,
        name: `Document ${i + 1}.pdf`,
        mimeType: 'application/pdf',
        size: 1024000,
        path: `/uploads/${companyId}/doc${i + 1}.pdf`,
        category: 'other',
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      await db.document.createMany({ data: documents });

      const score = await InvestabilityService.calculateScore(companyId);

      expect(score.breakdown.documentsUploaded).toBe(25);
    });

    it('should calculate maximum score', async () => {
      // Update company to have everything
      await db.company.update({
        where: { id: companyId },
        data: {
          kycVerified: true,
          financialsLinked: true,
          revenue: 2000000, // Above $1M threshold
        },
      });

      // Add 5 documents
      const documents = Array.from({ length: 5 }, (_, i) => ({
        id: uuid(),
        companyId,
        name: `Document ${i + 1}.pdf`,
        mimeType: 'application/pdf',
        size: 1024000,
        path: `/uploads/${companyId}/doc${i + 1}.pdf`,
        category: 'other',
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      await db.document.createMany({ data: documents });

      const score = await InvestabilityService.calculateScore(companyId);

      expect(score.score).toBe(100); // 30 + 20 + 25 + 25
      expect(score.breakdown).toEqual({
        kycVerified: 30,
        financialsLinked: 20,
        documentsUploaded: 25,
        revenueScore: 25,
      });
    });

    it('should throw error for non-existent company', async () => {
      const fakeId = uuid();

      await expect(InvestabilityService.calculateScore(fakeId))
        .rejects
        .toThrow('Company not found');
    });
  });

  describe('getRecommendations', () => {
    it('should provide all recommendations for new company', async () => {
      const recommendations = await InvestabilityService.getRecommendations(companyId);

      expect(recommendations).toHaveLength(4);
      expect(recommendations).toContain('Complete KYC verification to earn 30 points');
      expect(recommendations).toContain('Link your bank account to earn 20 points');
      expect(recommendations).toContain('Upload 5 more documents to maximize document points');
      expect(recommendations).toContain('As your revenue grows, your score will automatically improve');
    });

    it('should not recommend KYC when already verified', async () => {
      await db.company.update({
        where: { id: companyId },
        data: { kycVerified: true },
      });

      const recommendations = await InvestabilityService.getRecommendations(companyId);

      expect(recommendations).not.toContain('Complete KYC verification to earn 30 points');
      expect(recommendations).toContain('Link your bank account to earn 20 points');
    });

    it('should not recommend financials when already linked', async () => {
      await db.company.update({
        where: { id: companyId },
        data: { financialsLinked: true },
      });

      const recommendations = await InvestabilityService.getRecommendations(companyId);

      expect(recommendations).not.toContain('Link your bank account to earn 20 points');
      expect(recommendations).toContain('Complete KYC verification to earn 30 points');
    });

    it('should adjust document recommendation based on current count', async () => {
      // Add 2 documents
      const documents = Array.from({ length: 2 }, (_, i) => ({
        id: uuid(),
        companyId,
        name: `Document ${i + 1}.pdf`,
        mimeType: 'application/pdf',
        size: 1024000,
        path: `/uploads/${companyId}/doc${i + 1}.pdf`,
        category: 'other',
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      await db.document.createMany({ data: documents });

      const recommendations = await InvestabilityService.getRecommendations(companyId);

      expect(recommendations).toContain('Upload 3 more documents to maximize document points');
    });

    it('should not recommend documents when 5 or more uploaded', async () => {
      // Add 5 documents
      const documents = Array.from({ length: 5 }, (_, i) => ({
        id: uuid(),
        companyId,
        name: `Document ${i + 1}.pdf`,
        mimeType: 'application/pdf',
        size: 1024000,
        path: `/uploads/${companyId}/doc${i + 1}.pdf`,
        category: 'other',
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      await db.document.createMany({ data: documents });

      const recommendations = await InvestabilityService.getRecommendations(companyId);

      expect(recommendations.filter(r => r.includes('Upload'))).toHaveLength(0);
    });

    it('should not recommend revenue improvement for high-revenue companies', async () => {
      await db.company.update({
        where: { id: companyId },
        data: { revenue: 1500000 }, // Above $1M threshold
      });

      const recommendations = await InvestabilityService.getRecommendations(companyId);

      expect(recommendations).not.toContain('As your revenue grows, your score will automatically improve');
    });

    it('should provide minimal recommendations for fully optimized company', async () => {
      // Fully optimize company
      await db.company.update({
        where: { id: companyId },
        data: {
          kycVerified: true,
          financialsLinked: true,
          revenue: 2000000,
        },
      });

      // Add 5 documents
      const documents = Array.from({ length: 5 }, (_, i) => ({
        id: uuid(),
        companyId,
        name: `Document ${i + 1}.pdf`,
        mimeType: 'application/pdf',
        size: 1024000,
        path: `/uploads/${companyId}/doc${i + 1}.pdf`,
        category: 'other',
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      await db.document.createMany({ data: documents });

      const recommendations = await InvestabilityService.getRecommendations(companyId);

      expect(recommendations).toHaveLength(0);
    });
  });
});