import { Request, Response, NextFunction } from 'express';
import { db } from '../db';
import { scholarships } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { generateScholarshipSlug, generateCanonicalUrl } from '../seo/urlGenerator';
import { generateScholarshipMeta } from '../seo/metaGenerator.js';

/**
 * SEO-optimized scholarship detail page handler
 * Renders server-side HTML for search engine optimization
 */
export async function scholarshipDetailSSR(req: Request, res: Response, next: NextFunction) {
  try {
    const { id, slug } = req.params;
    
    if (!id) {
      return res.status(404).render('404', { 
        title: 'Scholarship Not Found',
        message: 'The scholarship you are looking for does not exist.'
      });
    }

    // Fetch scholarship data from database
    const [scholarship] = await db
      .select()
      .from(scholarships)
      .where(eq(scholarships.id, id))
      .limit(1);

    if (!scholarship) {
      return res.status(404).render('404', {
        title: 'Scholarship Not Found',
        message: 'The scholarship you are looking for does not exist.'
      });
    }

    // Generate proper slug and check for redirect
    const properSlug = generateScholarshipSlug(scholarship.title);
    const canonicalUrl = generateCanonicalUrl(req, scholarship.id, properSlug);
    
    // Redirect if slug doesn't match (SEO best practice)
    if (slug && slug !== properSlug) {
      return res.redirect(301, `/scholarships/${id}/${properSlug}`);
    }
    
    // If no slug provided, redirect to proper URL
    if (!slug) {
      return res.redirect(301, `/scholarships/${id}/${properSlug}`);
    }

    // Fetch related scholarships for internal linking (SEO benefit)
    const relatedScholarships = await db
      .select({
        id: scholarships.id,
        title: scholarships.title,
        organization: scholarships.organization,
        amount: scholarships.amount,
        deadline: scholarships.deadline
      })
      .from(scholarships)
      .where(eq(scholarships.isActive, true))
      .limit(5);

    // Add slugs to related scholarships
    const relatedWithSlugs = relatedScholarships
      .filter(s => s.id !== scholarship.id)
      .slice(0, 4)
      .map(s => ({
        ...s,
        slug: generateScholarshipSlug(s.title)
      }));

    // Generate meta tags
    const metaTags = generateScholarshipMeta(scholarship);
    
    // Determine if in development mode
    const isDevelopment = process.env.NODE_ENV === 'development';
    const baseUrl = `${req.protocol}://${req.get('host')}`;

    // Render the SSR template
    res.render('scholarship-detail', {
      scholarship,
      relatedScholarships: relatedWithSlugs,
      canonicalUrl,
      metaTags,
      isDevelopment,
      baseUrl
    });

  } catch (error) {
    console.error('SSR Error for scholarship detail:', error);
    next(error);
  }
}

/**
 * Scholarships listing page with SEO optimization
 * Supports category filtering and pagination
 */
export async function scholarshipsListingSSR(req: Request, res: Response, next: NextFunction) {
  try {
    const { category, page = '1' } = req.query;
    const pageNum = parseInt(page as string, 10) || 1;
    const limit = 20;
    const offset = (pageNum - 1) * limit;

    // Build query with optional category filter
    let query = db
      .select({
        id: scholarships.id,
        title: scholarships.title,
        organization: scholarships.organization,
        amount: scholarships.amount,
        deadline: scholarships.deadline,
        description: scholarships.description
      })
      .from(scholarships)
      .where(eq(scholarships.isActive, true))
      .limit(limit)
      .offset(offset);

    const scholarshipList = await query;
    
    // Add slugs for SEO URLs
    const scholarshipsWithSlugs = scholarshipList.map(s => ({
      ...s,
      slug: generateScholarshipSlug(s.title)
    }));

    // Get total count for pagination
    const [{ count }] = await db
      .select({ count: scholarships.id })
      .from(scholarships)
      .where(eq(scholarships.isActive, true));

    const totalPages = Math.ceil(Number(count) / limit);
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    
    // Generate pagination URLs
    const pagination = {
      currentPage: pageNum,
      totalPages,
      hasNext: pageNum < totalPages,
      hasPrev: pageNum > 1,
      nextUrl: pageNum < totalPages ? `/scholarships?page=${pageNum + 1}` : null,
      prevUrl: pageNum > 1 ? `/scholarships?page=${pageNum - 1}` : null
    };

    const pageTitle = category 
      ? `${category} Scholarships - Page ${pageNum} | ScholarLink`
      : `Scholarships - Page ${pageNum} | ScholarLink`;
    
    const pageDescription = category
      ? `Browse ${category} scholarships and apply with AI assistance. Page ${pageNum} of ${totalPages}.`
      : `Browse all available scholarships and apply with AI assistance. Page ${pageNum} of ${totalPages}.`;

    res.render('scholarships-listing', {
      scholarships: scholarshipsWithSlugs,
      pagination,
      category,
      pageTitle,
      pageDescription,
      canonicalUrl: `${baseUrl}/scholarships${category ? `?category=${category}` : ''}`,
      baseUrl
    });

  } catch (error) {
    console.error('SSR Error for scholarships listing:', error);
    next(error);
  }
}

/**
 * Generate comprehensive XML sitemap for all programmatic pages
 * Used by search engines for indexing 250-300 pages
 */
export async function generateSitemap(req: Request, res: Response, next: NextFunction) {
  try {
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const { PageGenerationService } = await import('../seo/pageGenerator');
    const pageGenerator = new PageGenerationService(baseUrl);
    
    // Generate all programmatic pages
    const sitemapData = await pageGenerator.generateSitemapData();
    
    // Build XML sitemap
    let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

    // Add all pages to sitemap
    for (const page of sitemapData) {
      const lastmod = new Date(page.lastModified).toISOString().split('T')[0];
      
      sitemap += `
  <url>
    <loc>${page.canonicalUrl}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${page.changeFreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`;
    }

    sitemap += `
</urlset>`;

    // Set appropriate headers for SEO
    res.set({
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      'X-Pages-Count': sitemapData.length.toString()
    });
    
    res.send(sitemap);

  } catch (error) {
    console.error('Sitemap generation error:', error);
    next(error);
  }
}

/**
 * Category-based scholarship listing page
 * SEO-optimized landing pages for each scholarship category
 */
export async function categoryScholarshipsSSR(req: Request, res: Response, next: NextFunction) {
  try {
    const { category } = req.params;
    const { page = '1' } = req.query;
    const pageNum = parseInt(page as string, 10) || 1;
    const limit = 20;
    const offset = (pageNum - 1) * limit;

    if (!category) {
      return res.status(404).render('404', { 
        title: 'Category Not Found',
        message: 'The scholarship category you are looking for does not exist.'
      });
    }

    // Mock category-based scholarships (in production, would filter by actual categories)
    const categoryScholarships = await db
      .select({
        id: scholarships.id,
        title: scholarships.title,
        organization: scholarships.organization,
        amount: scholarships.amount,
        deadline: scholarships.deadline,
        description: scholarships.description
      })
      .from(scholarships)
      .where(eq(scholarships.isActive, true))
      .limit(limit)
      .offset(offset);

    // Add slugs for SEO URLs
    const scholarshipsWithSlugs = categoryScholarships.map(s => ({
      ...s,
      slug: generateScholarshipSlug(s.title)
    }));

    const categoryName = category.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');

    const totalCount = scholarshipsWithSlugs.length;
    const totalPages = Math.ceil(totalCount / limit);
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    
    const pagination = {
      currentPage: pageNum,
      totalPages,
      hasNext: pageNum < totalPages,
      hasPrev: pageNum > 1,
      nextUrl: pageNum < totalPages ? `/scholarships/category/${category}?page=${pageNum + 1}` : null,
      prevUrl: pageNum > 1 ? `/scholarships/category/${category}?page=${pageNum - 1}` : null
    };

    const pageTitle = `${categoryName} Scholarships - Page ${pageNum} | ScholarLink`;
    const pageDescription = `Browse ${categoryName.toLowerCase()} scholarships and apply with AI assistance. Page ${pageNum} of ${totalPages}.`;

    res.render('category-scholarships', {
      scholarships: scholarshipsWithSlugs,
      category: categoryName,
      categorySlug: category,
      pagination,
      pageTitle,
      pageDescription,
      canonicalUrl: `${baseUrl}/scholarships/category/${category}`,
      baseUrl
    });

  } catch (error) {
    console.error('SSR Error for category scholarships:', error);
    next(error);
  }
}

/**
 * State-based scholarship listing page
 * SEO-optimized pages for each US state
 */
export async function stateScholarshipsSSR(req: Request, res: Response, next: NextFunction) {
  try {
    const { state } = req.params;
    const { page = '1' } = req.query;
    const pageNum = parseInt(page as string, 10) || 1;
    const limit = 20;
    const offset = (pageNum - 1) * limit;

    if (!state || state.length !== 2) {
      return res.status(404).render('404', { 
        title: 'State Not Found',
        message: 'The state you are looking for does not exist.'
      });
    }

    const stateCode = state.toUpperCase();
    
    // Mock state-based scholarships (in production, would filter by actual state requirements)
    const stateScholarships = await db
      .select({
        id: scholarships.id,
        title: scholarships.title,
        organization: scholarships.organization,
        amount: scholarships.amount,
        deadline: scholarships.deadline,
        description: scholarships.description
      })
      .from(scholarships)
      .where(eq(scholarships.isActive, true))
      .limit(limit)
      .offset(offset);

    // Add slugs for SEO URLs
    const scholarshipsWithSlugs = stateScholarships.map(s => ({
      ...s,
      slug: generateScholarshipSlug(s.title)
    }));

    // State name mapping
    const stateNames: Record<string, string> = {
      'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas',
      'CA': 'California', 'CO': 'Colorado', 'CT': 'Connecticut', 'DE': 'Delaware',
      'FL': 'Florida', 'GA': 'Georgia', 'HI': 'Hawaii', 'ID': 'Idaho',
      'IL': 'Illinois', 'IN': 'Indiana', 'IA': 'Iowa', 'KS': 'Kansas',
      'KY': 'Kentucky', 'LA': 'Louisiana', 'ME': 'Maine', 'MD': 'Maryland',
      'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota', 'MS': 'Mississippi',
      'MO': 'Missouri', 'MT': 'Montana', 'NE': 'Nebraska', 'NV': 'Nevada',
      'NH': 'New Hampshire', 'NJ': 'New Jersey', 'NM': 'New Mexico', 'NY': 'New York',
      'NC': 'North Carolina', 'ND': 'North Dakota', 'OH': 'Ohio', 'OK': 'Oklahoma',
      'OR': 'Oregon', 'PA': 'Pennsylvania', 'RI': 'Rhode Island', 'SC': 'South Carolina',
      'SD': 'South Dakota', 'TN': 'Tennessee', 'TX': 'Texas', 'UT': 'Utah',
      'VT': 'Vermont', 'VA': 'Virginia', 'WA': 'Washington', 'WV': 'West Virginia',
      'WI': 'Wisconsin', 'WY': 'Wyoming'
    };

    const stateName = stateNames[stateCode];
    if (!stateName) {
      return res.status(404).render('404', { 
        title: 'State Not Found',
        message: 'Invalid state code provided.'
      });
    }

    const totalCount = scholarshipsWithSlugs.length;
    const totalPages = Math.ceil(totalCount / limit);
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    
    const pagination = {
      currentPage: pageNum,
      totalPages,
      hasNext: pageNum < totalPages,
      hasPrev: pageNum > 1,
      nextUrl: pageNum < totalPages ? `/scholarships/state/${state}?page=${pageNum + 1}` : null,
      prevUrl: pageNum > 1 ? `/scholarships/state/${state}?page=${pageNum - 1}` : null
    };

    const pageTitle = `${stateName} Scholarships - Page ${pageNum} | ScholarLink`;
    const pageDescription = `Discover scholarships available for ${stateName} students. Find state-specific grants and local organization awards.`;

    res.render('state-scholarships', {
      scholarships: scholarshipsWithSlugs,
      stateName,
      stateCode,
      pagination,
      pageTitle,
      pageDescription,
      canonicalUrl: `${baseUrl}/scholarships/state/${state}`,
      baseUrl
    });

  } catch (error) {
    console.error('SSR Error for state scholarships:', error);
    next(error);
  }
}