import { db } from '@/config/database';
import type { InvestabilityScore } from '@capital-marketplace/types';

export class InvestabilityService {
  /**
   * Calculate investability score for a company
   * Score breakdown:
   * - KYC Verified: 30 points
   * - Financials Linked: 20 points
   * - Documents Uploaded: 25 points (5 points per document, max 5 docs)
   * - Revenue Score: 25 points (scaled based on revenue)
   */
  static async calculateScore(companyId: string): Promise<InvestabilityScore> {
    const company = await db.company.findUnique({
      where: { id: companyId },
      include: {
        documents: true,
      },
    });

    if (!company) {
      throw new Error('Company not found');
    }

    const breakdown = {
      kycVerified: company.kycVerified ? 30 : 0,
      financialsLinked: company.financialsLinked ? 20 : 0,
      documentsUploaded: Math.min(company.documents.length * 5, 25),
      revenueScore: this.calculateRevenueScore(company.revenue),
    };

    const score = Object.values(breakdown).reduce((sum, value) => sum + value, 0);

    return {
      score: Math.min(score, 100), // Cap at 100
      breakdown,
    };
  }

  /**
   * Calculate revenue score (0-25 points based on revenue)
   * Linear scale from $0 to $1M = 0-25 points
   * Above $1M = 25 points
   */
  private static calculateRevenueScore(revenue: number): number {
    const maxRevenue = 1_000_000; // $1M
    const maxPoints = 25;

    if (revenue >= maxRevenue) {
      return maxPoints;
    }

    return Math.round((revenue / maxRevenue) * maxPoints);
  }

  /**
   * Get score with caching (in production, you might use Redis)
   */
  static async getScoreWithCache(companyId: string): Promise<InvestabilityScore> {
    // For now, just calculate directly
    // In production, implement caching strategy
    return this.calculateScore(companyId);
  }

  /**
   * Update score triggers - call this when relevant data changes
   */
  static async onCompanyDataChange(companyId: string): Promise<void> {
    // In a real system, you might:
    // 1. Invalidate cache
    // 2. Send notifications if score improved significantly
    // 3. Update analytics/tracking

    const newScore = await this.calculateScore(companyId);

    // Log significant score changes
    console.log(`Score updated for company ${companyId}: ${newScore.score}`);
  }

  /**
   * Get scoring recommendations for improving score
   */
  static async getRecommendations(companyId: string): Promise<string[]> {
    const company = await db.company.findUnique({
      where: { id: companyId },
      include: {
        documents: true,
      },
    });

    if (!company) {
      throw new Error('Company not found');
    }

    const recommendations: string[] = [];

    if (!company.kycVerified) {
      recommendations.push('Complete KYC verification to earn 30 points');
    }

    if (!company.financialsLinked) {
      recommendations.push('Link your bank account to earn 20 points');
    }

    if (company.documents.length < 5) {
      const needed = 5 - company.documents.length;
      recommendations.push(`Upload ${needed} more document${needed > 1 ? 's' : ''} to maximize document points`);
    }

    if (company.revenue < 1_000_000) {
      recommendations.push('As your revenue grows, your score will automatically improve');
    }

    return recommendations;
  }
}