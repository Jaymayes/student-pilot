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
 * Generate XML sitemap for scholarships
 * Used by search engines for indexing
 */
export async function generateSitemap(req: Request, res: Response, next: NextFunction) {
  try {
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    
    // Fetch all active scholarships
    const allScholarships = await db
      .select({
        id: scholarships.id,
        title: scholarships.title,
        updatedAt: scholarships.updatedAt
      })
      .from(scholarships)
      .where(eq(scholarships.isActive, true));

    // Generate sitemap XML
    let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${baseUrl}/scholarships</loc>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>`;

    // Add scholarship detail pages
    for (const scholarship of allScholarships) {
      const slug = generateScholarshipSlug(scholarship.title);
      const lastmod = scholarship.updatedAt 
        ? new Date(scholarship.updatedAt).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0];
      
      sitemap += `
  <url>
    <loc>${baseUrl}/scholarships/${scholarship.id}/${slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
    }

    sitemap += `
</urlset>`;

    res.set('Content-Type', 'application/xml');
    res.send(sitemap);

  } catch (error) {
    console.error('Sitemap generation error:', error);
    next(error);
  }
}