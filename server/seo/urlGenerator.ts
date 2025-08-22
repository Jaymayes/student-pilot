import { Request } from 'express';

/**
 * Generate SEO-friendly slug from scholarship title
 * Removes special characters and creates URL-safe string
 */
export function generateScholarshipSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters except hyphens
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Generate canonical URL for scholarship detail page
 * Ensures consistent URL structure for SEO
 */
export function generateCanonicalUrl(req: Request, scholarshipId: string, slug: string): string {
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  return `${baseUrl}/scholarships/${scholarshipId}/${slug}`;
}

/**
 * Generate category-based URL for scholarship listings
 * Supports faceted navigation for SEO
 */
export function generateCategoryUrl(baseUrl: string, category: string, page?: number): string {
  const url = new URL('/scholarships', baseUrl);
  
  if (category) {
    url.searchParams.set('category', category);
  }
  
  if (page && page > 1) {
    url.searchParams.set('page', page.toString());
  }
  
  return url.toString();
}

/**
 * Extract and validate scholarship ID from URL parameters
 * Ensures proper ID format for database queries
 */
export function validateScholarshipId(id: string): boolean {
  // Check if ID is a valid UUID or integer format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const integerRegex = /^\d+$/;
  
  return uuidRegex.test(id) || integerRegex.test(id);
}

/**
 * Generate breadcrumb trail for scholarship pages
 * Supports structured data markup for SEO
 */
export function generateBreadcrumbs(scholarshipTitle?: string, category?: string) {
  const breadcrumbs = [
    { name: 'Home', url: '/' },
    { name: 'Scholarships', url: '/scholarships' }
  ];
  
  if (category) {
    breadcrumbs.push({
      name: category,
      url: `/scholarships?category=${encodeURIComponent(category)}`
    });
  }
  
  if (scholarshipTitle) {
    breadcrumbs.push({
      name: scholarshipTitle,
      url: '' // Current page - empty string instead of null
    });
  }
  
  return breadcrumbs;
}

/**
 * Generate pagination URLs for listing pages
 * Maintains query parameters across pages
 */
export function generatePaginationUrls(
  baseUrl: string, 
  currentPage: number, 
  totalPages: number, 
  queryParams: Record<string, string> = {}
) {
  const urls = {
    first: null as string | null,
    prev: null as string | null,
    next: null as string | null,
    last: null as string | null
  };
  
  const buildUrl = (page: number) => {
    const url = new URL('/scholarships', baseUrl);
    
    // Add existing query parameters
    Object.entries(queryParams).forEach(([key, value]) => {
      if (value) url.searchParams.set(key, value);
    });
    
    // Add page parameter
    if (page > 1) {
      url.searchParams.set('page', page.toString());
    }
    
    return url.toString();
  };
  
  if (currentPage > 1) {
    urls.first = buildUrl(1);
    urls.prev = buildUrl(currentPage - 1);
  }
  
  if (currentPage < totalPages) {
    urls.next = buildUrl(currentPage + 1);
    urls.last = buildUrl(totalPages);
  }
  
  return urls;
}