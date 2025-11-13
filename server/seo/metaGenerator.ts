import type { Scholarship } from '@shared/schema';
import { serviceConfig } from '../serviceConfig';

interface MetaTags {
  title: string;
  description: string;
  keywords: string[];
  openGraph: {
    title: string;
    description: string;
    type: string;
    image: string;
  };
  twitter: {
    card: string;
    title: string;
    description: string;
    image: string;
  };
  structuredData: object;
}

/**
 * Generate comprehensive meta tags for scholarship detail pages
 * Optimized for search engines and social media sharing
 */
export function generateScholarshipMeta(scholarship: any): MetaTags {
  // Truncate description for meta tags
  const shortDescription = scholarship.description?.length > 160 
    ? scholarship.description.substring(0, 157) + '...'
    : scholarship.description || '';

  // Generate keywords from scholarship data
  const keywords = [
    'scholarship',
    'financial aid',
    'college funding',
    'education grant',
    scholarship.organization?.toLowerCase(),
    scholarship.fieldOfStudy?.toLowerCase(),
    scholarship.academicLevel?.toLowerCase()
  ].filter((keyword): keyword is string => Boolean(keyword));

  // Format deadline for display
  const deadlineFormatted = scholarship.deadline 
    ? new Date(scholarship.deadline).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })
    : '';

  const title = `${scholarship.title} - ${scholarship.organization} | ScholarLink`;
  const description = `${shortDescription} Award: $${scholarship.amount?.toLocaleString() || 'N/A'}. Deadline: ${deadlineFormatted}. Apply with AI assistance.`;

  return {
    title,
    description,
    keywords,
    openGraph: {
      title: scholarship.title,
      description: shortDescription,
      type: 'article',
      image: '/og-scholarship.png' // Default scholarship image
    },
    twitter: {
      card: 'summary_large_image',
      title: scholarship.title,
      description: shortDescription,
      image: '/og-scholarship.png'
    },
    structuredData: {
      '@context': 'https://schema.org',
      '@type': 'EducationalOccupationalCredential',
      name: scholarship.title,
      description: scholarship.description,
      provider: {
        '@type': 'Organization',
        name: scholarship.organization
      },
      offers: {
        '@type': 'Offer',
        price: scholarship.amount?.toString() || '0',
        priceCurrency: 'USD',
        validThrough: scholarship.deadline
      },
      applicationDeadline: scholarship.deadline,
      educationalLevel: scholarship.eligibilityCriteria?.academicLevel || 'Any',
      audience: {
        '@type': 'EducationalAudience',
        educationalRole: 'student'
      },
      isAccessibleForFree: true,
      inLanguage: 'en-US'
    }
  };
}

/**
 * Generate meta tags for scholarship listing pages
 * Supports category-specific and paginated content
 */
export function generateListingMeta(
  category?: string, 
  page: number = 1, 
  totalScholarships?: number
): MetaTags {
  const baseTitle = category 
    ? `${category} Scholarships` 
    : 'Scholarships';
  
  const title = page > 1 
    ? `${baseTitle} - Page ${page} | ScholarLink`
    : `${baseTitle} | ScholarLink`;

  const description = category
    ? `Browse ${totalScholarships || 'thousands of'} ${category.toLowerCase()} scholarships. Find the perfect match and apply with AI-powered assistance. Page ${page}.`
    : `Discover ${totalScholarships || 'thousands of'} scholarships across all fields. AI-powered matching and application assistance. Page ${page}.`;

  const keywords = [
    'scholarships',
    'financial aid',
    'college funding',
    'education grants',
    'student aid',
    category?.toLowerCase()
  ].filter((keyword): keyword is string => Boolean(keyword));

  return {
    title,
    description,
    keywords,
    openGraph: {
      title: baseTitle,
      description,
      type: 'website',
      image: '/og-scholarships-listing.png'
    },
    twitter: {
      card: 'summary_large_image',
      title: baseTitle,
      description,
      image: '/og-scholarships-listing.png'
    },
    structuredData: {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: title,
      description,
      mainEntity: {
        '@type': 'ItemList',
        name: baseTitle,
        description: 'Collection of educational scholarships and grants'
      }
    }
  };
}

/**
 * Generate meta tags for the main landing page
 * Focuses on brand awareness and value proposition
 */
export function generateHomeMeta(): MetaTags {
  const title = 'ScholarLink - AI-Powered Scholarship Discovery & Application Assistant';
  const description = 'Discover personalized scholarships with AI matching. Get essay writing assistance and application tracking. Find funding for your education with ScholarLink.';
  
  return {
    title,
    description,
    keywords: [
      'scholarship finder',
      'AI scholarship matching',
      'college funding',
      'financial aid',
      'essay writing help',
      'education grants',
      'student assistance'
    ],
    openGraph: {
      title,
      description,
      type: 'website',
      image: '/og-home.png'
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      image: '/og-home.png'
    },
    structuredData: {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'ScholarLink',
      description,
      url: serviceConfig.frontends.student,
      potentialAction: {
        '@type': 'SearchAction',
        target: `${serviceConfig.frontends.student}/scholarships?q={search_term_string}`,
        'query-input': 'required name=search_term_string'
      },
      provider: {
        '@type': 'Organization',
        name: 'ScholarLink',
        description: 'AI-powered scholarship discovery and application platform'
      }
    }
  };
}