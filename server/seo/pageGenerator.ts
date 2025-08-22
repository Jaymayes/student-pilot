import { db } from '../db';
import { scholarships } from '@shared/schema';
import { eq, desc, asc, and, or, like, sql } from 'drizzle-orm';
import { generateScholarshipSlug } from './urlGenerator';

/**
 * Page generation service for programmatic SEO
 * Generates structured data for 250-300 scholarship entity pages
 */

interface PageMetadata {
  id: string;
  title: string;
  slug: string;
  description: string;
  canonicalUrl: string;
  lastModified: string;
  priority: number;
  changeFreq: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
}

interface CategoryPage {
  category: string;
  slug: string;
  title: string;
  description: string;
  scholarshipCount: number;
  totalAmount: number;
  avgAmount: number;
}

interface StateBasedPage {
  state: string;
  stateCode: string;
  title: string;
  description: string;
  scholarshipCount: number;
  topScholarships: Array<{
    id: string;
    title: string;
    organization: string;
    amount: number;
    slug: string;
  }>;
}

export class PageGenerationService {
  private baseUrl: string;

  constructor(baseUrl: string = 'https://student-pilot-jamarrlmayes.replit.app') {
    this.baseUrl = baseUrl;
  }

  /**
   * Generate all scholarship detail pages
   * Target: 200+ individual scholarship pages
   */
  async generateScholarshipPages(): Promise<PageMetadata[]> {
    const scholarshipData = await db
      .select({
        id: scholarships.id,
        title: scholarships.title,
        organization: scholarships.organization,
        description: scholarships.description,
        amount: scholarships.amount,
        deadline: scholarships.deadline,
        updatedAt: scholarships.updatedAt,
        isActive: scholarships.isActive
      })
      .from(scholarships)
      .where(eq(scholarships.isActive, true))
      .orderBy(desc(scholarships.amount), asc(scholarships.deadline))
      .limit(250); // Target 250 scholarship pages

    return scholarshipData.map(scholarship => {
      const slug = generateScholarshipSlug(scholarship.title);
      const lastModified = scholarship.updatedAt?.toISOString() || new Date().toISOString();
      
      // Calculate priority based on amount and deadline urgency
      const deadlineScore = this.calculateDeadlineUrgency(scholarship.deadline);
      const amountScore = Math.min(1.0, scholarship.amount / 50000); // Max $50k for scoring
      const priority = Math.round((deadlineScore * 0.4 + amountScore * 0.6) * 100) / 100;

      return {
        id: scholarship.id,
        title: `${scholarship.title} - ${scholarship.organization}`,
        slug,
        description: this.generateScholarshipDescription(scholarship),
        canonicalUrl: `${this.baseUrl}/scholarships/${scholarship.id}/${slug}`,
        lastModified,
        priority: Math.max(0.1, Math.min(1.0, priority)),
        changeFreq: deadlineScore > 0.8 ? 'daily' as const : 'weekly' as const
      };
    });
  }

  /**
   * Generate category-based landing pages
   * Target: 25-30 category pages
   */
  async generateCategoryPages(): Promise<CategoryPage[]> {
    // Define target categories for programmatic SEO
    const categories = [
      'stem', 'engineering', 'medical', 'nursing', 'business', 'education',
      'arts', 'music', 'athletics', 'academic-excellence', 'need-based',
      'minority', 'women', 'veterans', 'first-generation', 'community-service',
      'undergraduate', 'graduate', 'phd', 'trade-school', 'nursing-school',
      'medical-school', 'law-school', 'mba', 'international-students',
      'state-specific', 'merit-based'
    ];

    const categoryPages: CategoryPage[] = [];

    for (const category of categories) {
      // Mock category data - in production this would query actual scholarship categorization
      const scholarshipCount = Math.floor(Math.random() * 50) + 10; // 10-60 scholarships per category
      const totalAmount = scholarshipCount * (Math.floor(Math.random() * 30000) + 5000);
      const avgAmount = Math.floor(totalAmount / scholarshipCount);

      categoryPages.push({
        category,
        slug: category.toLowerCase().replace(/\s+/g, '-'),
        title: `${this.formatCategoryName(category)} Scholarships`,
        description: this.generateCategoryDescription(category, scholarshipCount, avgAmount),
        scholarshipCount,
        totalAmount,
        avgAmount
      });
    }

    return categoryPages;
  }

  /**
   * Generate state-based scholarship pages
   * Target: 50 state pages
   */
  async generateStatePages(): Promise<StateBasedPage[]> {
    const states = [
      { name: 'Alabama', code: 'AL' }, { name: 'Alaska', code: 'AK' },
      { name: 'Arizona', code: 'AZ' }, { name: 'Arkansas', code: 'AR' },
      { name: 'California', code: 'CA' }, { name: 'Colorado', code: 'CO' },
      { name: 'Connecticut', code: 'CT' }, { name: 'Delaware', code: 'DE' },
      { name: 'Florida', code: 'FL' }, { name: 'Georgia', code: 'GA' },
      { name: 'Hawaii', code: 'HI' }, { name: 'Idaho', code: 'ID' },
      { name: 'Illinois', code: 'IL' }, { name: 'Indiana', code: 'IN' },
      { name: 'Iowa', code: 'IA' }, { name: 'Kansas', code: 'KS' },
      { name: 'Kentucky', code: 'KY' }, { name: 'Louisiana', code: 'LA' },
      { name: 'Maine', code: 'ME' }, { name: 'Maryland', code: 'MD' },
      { name: 'Massachusetts', code: 'MA' }, { name: 'Michigan', code: 'MI' },
      { name: 'Minnesota', code: 'MN' }, { name: 'Mississippi', code: 'MS' },
      { name: 'Missouri', code: 'MO' }, { name: 'Montana', code: 'MT' },
      { name: 'Nebraska', code: 'NE' }, { name: 'Nevada', code: 'NV' },
      { name: 'New Hampshire', code: 'NH' }, { name: 'New Jersey', code: 'NJ' },
      { name: 'New Mexico', code: 'NM' }, { name: 'New York', code: 'NY' },
      { name: 'North Carolina', code: 'NC' }, { name: 'North Dakota', code: 'ND' },
      { name: 'Ohio', code: 'OH' }, { name: 'Oklahoma', code: 'OK' },
      { name: 'Oregon', code: 'OR' }, { name: 'Pennsylvania', code: 'PA' },
      { name: 'Rhode Island', code: 'RI' }, { name: 'South Carolina', code: 'SC' },
      { name: 'South Dakota', code: 'SD' }, { name: 'Tennessee', code: 'TN' },
      { name: 'Texas', code: 'TX' }, { name: 'Utah', code: 'UT' },
      { name: 'Vermont', code: 'VT' }, { name: 'Virginia', code: 'VA' },
      { name: 'Washington', code: 'WA' }, { name: 'West Virginia', code: 'WV' },
      { name: 'Wisconsin', code: 'WI' }, { name: 'Wyoming', code: 'WY' }
    ];

    const statePages: StateBasedPage[] = [];

    for (const state of states) {
      // Get sample scholarships for this state (mock data for now)
      const topScholarships = await this.getTopScholarshipsForState(state.code);
      const scholarshipCount = Math.floor(Math.random() * 30) + 5; // 5-35 per state

      statePages.push({
        state: state.name,
        stateCode: state.code,
        title: `${state.name} Scholarships`,
        description: `Discover ${scholarshipCount} scholarships available for ${state.name} students. Find state-specific grants, local organization awards, and college scholarships for ${state.name} residents.`,
        scholarshipCount,
        topScholarships
      });
    }

    return statePages;
  }

  /**
   * Generate comprehensive sitemap data
   * Combines all page types for XML sitemap generation
   */
  async generateSitemapData(): Promise<PageMetadata[]> {
    const [scholarshipPages, categoryPages, statePages] = await Promise.all([
      this.generateScholarshipPages(),
      this.generateCategoryPages(),
      this.generateStatePages()
    ]);

    // Convert category pages to PageMetadata format
    const categoryPageMetadata: PageMetadata[] = categoryPages.map(cat => ({
      id: `category-${cat.slug}`,
      title: cat.title,
      slug: cat.slug,
      description: cat.description,
      canonicalUrl: `${this.baseUrl}/scholarships/category/${cat.slug}`,
      lastModified: new Date().toISOString(),
      priority: 0.8, // High priority for category pages
      changeFreq: 'daily' as const
    }));

    // Convert state pages to PageMetadata format
    const statePageMetadata: PageMetadata[] = statePages.map(state => ({
      id: `state-${state.stateCode.toLowerCase()}`,
      title: state.title,
      slug: state.stateCode.toLowerCase(),
      description: state.description,
      canonicalUrl: `${this.baseUrl}/scholarships/state/${state.stateCode.toLowerCase()}`,
      lastModified: new Date().toISOString(),
      priority: 0.7, // Medium-high priority for state pages
      changeFreq: 'weekly' as const
    }));

    // Combine all pages
    return [
      ...scholarshipPages,
      ...categoryPageMetadata,
      ...statePageMetadata,
      // Add main pages
      {
        id: 'home',
        title: 'ScholarLink - AI-Powered Scholarship Discovery',
        slug: '',
        description: 'Discover personalized scholarships with AI matching and application assistance.',
        canonicalUrl: this.baseUrl,
        lastModified: new Date().toISOString(),
        priority: 1.0,
        changeFreq: 'daily' as const
      },
      {
        id: 'scholarships-main',
        title: 'Scholarships',
        slug: 'scholarships',
        description: 'Browse all available scholarships and find your perfect match.',
        canonicalUrl: `${this.baseUrl}/scholarships`,
        lastModified: new Date().toISOString(),
        priority: 0.9,
        changeFreq: 'daily' as const
      }
    ];
  }

  /**
   * Calculate deadline urgency score (0-1)
   */
  private calculateDeadlineUrgency(deadline: Date): number {
    const now = new Date();
    const deadlineTime = new Date(deadline).getTime();
    const nowTime = now.getTime();
    
    if (deadlineTime < nowTime) return 0; // Expired
    
    const daysUntilDeadline = (deadlineTime - nowTime) / (1000 * 60 * 60 * 24);
    
    if (daysUntilDeadline <= 7) return 1.0; // Very urgent
    if (daysUntilDeadline <= 30) return 0.8; // Urgent
    if (daysUntilDeadline <= 90) return 0.6; // Moderate
    return 0.4; // Low urgency
  }

  /**
   * Generate SEO-optimized scholarship description
   */
  private generateScholarshipDescription(scholarship: any): string {
    const deadline = new Date(scholarship.deadline).toLocaleDateString();
    const amount = scholarship.amount.toLocaleString();
    
    return `Apply for the ${scholarship.title} scholarship from ${scholarship.organization}. Award amount: $${amount}. Deadline: ${deadline}. Get AI-powered application assistance and personalized matching.`;
  }

  /**
   * Generate category description with SEO keywords
   */
  private generateCategoryDescription(category: string, count: number, avgAmount: number): string {
    const categoryName = this.formatCategoryName(category);
    const avgAmountFormatted = avgAmount.toLocaleString();
    
    return `Explore ${count} ${categoryName.toLowerCase()} scholarships with an average award of $${avgAmountFormatted}. Find the perfect scholarship match with AI-powered recommendations and application assistance.`;
  }

  /**
   * Format category name for display
   */
  private formatCategoryName(category: string): string {
    return category
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Get top scholarships for a specific state (mock implementation)
   */
  private async getTopScholarshipsForState(stateCode: string): Promise<Array<{
    id: string;
    title: string;
    organization: string;
    amount: number;
    slug: string;
  }>> {
    // Mock implementation - in production this would query actual state-specific scholarships
    const mockScholarships = [
      {
        id: `${stateCode}-scholarship-1`,
        title: `${stateCode} State Excellence Scholarship`,
        organization: `${stateCode} Department of Education`,
        amount: Math.floor(Math.random() * 10000) + 5000,
        slug: `${stateCode.toLowerCase()}-state-excellence-scholarship`
      },
      {
        id: `${stateCode}-scholarship-2`,
        title: `${stateCode} Community Foundation Grant`,
        organization: `${stateCode} Community Foundation`,
        amount: Math.floor(Math.random() * 8000) + 3000,
        slug: `${stateCode.toLowerCase()}-community-foundation-grant`
      },
      {
        id: `${stateCode}-scholarship-3`,
        title: `${stateCode} Merit Award`,
        organization: `${stateCode} Higher Education Board`,
        amount: Math.floor(Math.random() * 12000) + 2000,
        slug: `${stateCode.toLowerCase()}-merit-award`
      }
    ];

    return mockScholarships;
  }

  /**
   * Get page generation statistics
   */
  async getGenerationStats(): Promise<{
    totalPages: number;
    scholarshipPages: number;
    categoryPages: number;
    statePages: number;
    mainPages: number;
  }> {
    const sitemapData = await this.generateSitemapData();
    
    return {
      totalPages: sitemapData.length,
      scholarshipPages: sitemapData.filter(p => p.id.startsWith('scholarship-') || !isNaN(Number(p.id))).length,
      categoryPages: sitemapData.filter(p => p.id.startsWith('category-')).length,
      statePages: sitemapData.filter(p => p.id.startsWith('state-')).length,
      mainPages: sitemapData.filter(p => ['home', 'scholarships-main'].includes(p.id)).length
    };
  }
}