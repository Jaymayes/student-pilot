/**
 * SEO Page Generator
 * 
 * Generates high-quality scholarship pages for state×major combinations
 * with unique copy, internal links, and proper canonical/noindex settings
 */

import { sitemapManager } from './sitemapManager';

interface GeneratedPage {
  slug: string;
  title: string;
  metaDescription: string;
  canonical: string;
  noindex: boolean;
  h1: string;
  content: string;
  internalLinks: string[];
  createdAt: string;
}

// State and major data for combinations
const STATES = [
  'alabama', 'alaska', 'arizona', 'arkansas', 'california', 'colorado',
  'connecticut', 'delaware', 'florida', 'georgia', 'hawaii', 'idaho',
  'illinois', 'indiana', 'iowa', 'kansas', 'kentucky', 'louisiana',
  'maine', 'maryland', 'massachusetts', 'michigan', 'minnesota',
  'mississippi', 'missouri', 'montana', 'nebraska', 'nevada',
  'new-hampshire', 'new-jersey', 'new-mexico', 'new-york',
  'north-carolina', 'north-dakota', 'ohio', 'oklahoma', 'oregon',
  'pennsylvania', 'rhode-island', 'south-carolina', 'south-dakota',
  'tennessee', 'texas', 'utah', 'vermont', 'virginia', 'washington',
  'west-virginia', 'wisconsin', 'wyoming'
];

const MAJORS = [
  'computer-science', 'engineering', 'nursing', 'business', 'education',
  'psychology', 'biology', 'communications', 'criminal-justice', 'art'
];

class SeoPageGenerator {
  private generatedPages: GeneratedPage[] = [];
  private baseUrl = 'https://student-pilot-jamarrlmayes.replit.app';

  /**
   * Generate state×major scholarship pages
   */
  generatePages(count: number): GeneratedPage[] {
    const pages: GeneratedPage[] = [];
    let generated = 0;

    for (const state of STATES) {
      if (generated >= count) break;
      
      for (const major of MAJORS) {
        if (generated >= count) break;

        const stateFormatted = this.formatStateName(state);
        const majorFormatted = this.formatMajorName(major);
        const slug = `/scholarships/${state}/${major}`;
        
        const page: GeneratedPage = {
          slug,
          title: `${majorFormatted} Scholarships in ${stateFormatted} | ScholarLink`,
          metaDescription: `Discover ${majorFormatted.toLowerCase()} scholarships available in ${stateFormatted}. Find financial aid opportunities for students pursuing ${majorFormatted.toLowerCase()} degrees.`,
          canonical: `${this.baseUrl}${slug}`,
          noindex: false, // Indexable
          h1: `${majorFormatted} Scholarships in ${stateFormatted}`,
          content: this.generateUniqueContent(stateFormatted, majorFormatted),
          internalLinks: this.generateInternalLinks(state, major),
          createdAt: new Date().toISOString()
        };

        pages.push(page);
        generated++;
      }
    }

    this.generatedPages.push(...pages);
    return pages;
  }

  private formatStateName(slug: string): string {
    return slug.split('-').map(w => 
      w.charAt(0).toUpperCase() + w.slice(1)
    ).join(' ');
  }

  private formatMajorName(slug: string): string {
    return slug.split('-').map(w => 
      w.charAt(0).toUpperCase() + w.slice(1)
    ).join(' ');
  }

  private generateUniqueContent(state: string, major: string): string {
    return `
      <section>
        <p>Looking for ${major.toLowerCase()} scholarships in ${state}? 
        ScholarLink helps students discover financial aid opportunities 
        tailored to their academic goals and location.</p>
        
        <h2>Why ${major} in ${state}?</h2>
        <p>${state} offers excellent programs for ${major.toLowerCase()} students,
        with numerous scholarship opportunities from state institutions, 
        private foundations, and industry partners.</p>
        
        <h2>How to Apply</h2>
        <p>Create your ScholarLink profile to get matched with scholarships 
        that fit your qualifications. Our AI-powered matching system considers 
        your GPA, major, location, and extracurricular activities.</p>
      </section>
    `;
  }

  private generateInternalLinks(state: string, major: string): string[] {
    return [
      `/scholarships/${state}`,
      `/scholarships/major/${major}`,
      '/browse',
      '/pricing'
    ];
  }

  /**
   * Get generated pages for sitemap
   */
  getGeneratedUrls(): string[] {
    return this.generatedPages.map(p => p.slug);
  }

  /**
   * Generate report
   */
  generateReport(): string {
    let report = '# SEO Page Generation Report\n\n';
    report += `**Generated**: ${this.generatedPages.length} pages\n`;
    report += `**Timestamp**: ${new Date().toISOString()}\n\n`;
    
    report += '## Page Statistics\n\n';
    report += '| Metric | Value |\n';
    report += '|--------|-------|\n';
    report += `| Total pages | ${this.generatedPages.length} |\n`;
    report += `| States covered | ${new Set(this.generatedPages.map(p => p.slug.split('/')[2])).size} |\n`;
    report += `| Majors covered | ${new Set(this.generatedPages.map(p => p.slug.split('/')[3])).size} |\n`;
    report += `| Canonical set | 100% |\n`;
    report += `| NoIndex false | 100% |\n`;
    
    report += '\n## Sample Pages\n\n';
    this.generatedPages.slice(0, 5).forEach(p => {
      report += `- ${p.slug}: "${p.title}"\n`;
    });

    return report;
  }

  getPageCount(): number {
    return this.generatedPages.length;
  }
}

export const seoPageGenerator = new SeoPageGenerator();
