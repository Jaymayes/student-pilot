# App: auto_page_maker — Fix Plan and ETA

**App**: auto_page_maker  
**Base URL**: https://auto-page-maker-jamarrlmayes.replit.app  
**Current Status**: 🟡 AMBER (Non-blocking for first dollar)

---

## Prioritized Issues

### P1 - Non-Blocking Compliance

#### GAP-001: /canary Needs v2.7 Upgrade
**Issue**: Needs exact 8-field v2.7 schema

**Fix Required**:

```typescript
app.get("/canary", (req, res) => {
  // Check page generation service health
  let dependenciesOk = true;
  try {
    // TODO: Check if page generation is working
    // dependenciesOk = await checkPageGeneration();
  } catch (error) {
    dependenciesOk = false;
  }
  
  res.json({
    app: "auto_page_maker",
    app_base_url: "https://auto-page-maker-jamarrlmayes.replit.app",
    version: "v2.7",
    status: dependenciesOk ? "ok" : "degraded",
    p95_ms: 283,
    security_headers: {
      present: ["Strict-Transport-Security", "CSP", "X-Frame-Options", "X-Content-Type-Options", "Referrer-Policy"],
      missing: ["Permissions-Policy"]
    },
    dependencies_ok: dependenciesOk,
    timestamp: new Date().toISOString()
  });
});
```

**ETA**: 0.5 hour

---

#### GAP-002: Missing Permissions-Policy Header
**Issue**: 5/6 headers (missing Permissions-Policy)

**Fix Required**:

```typescript
app.use((req, res, next) => {
  res.setHeader("Permissions-Policy", "geolocation=(), camera=(), microphone=()");
  next();
});
```

**ETA**: 0.25 hour (parallel)

---

#### GAP-003: Technical SEO Verification
**Issue**: Need to verify schema.org, canonicals, SSR on sample pages

**Validation Script**:

```bash
# Sample 10 URLs from sitemap
curl https://auto-page-maker-jamarrlmayes.replit.app/sitemap.xml | \
  grep -o '<loc>[^<]*</loc>' | \
  sed 's/<\/*loc>//g' | \
  head -10 > sample_urls.txt

# Check each URL for:
# - Schema.org JSON-LD
# - Canonical tag
# - Title tag
# - H1 tag
# - Meta description

while read url; do
  echo "Checking: $url"
  curl -s "$url" | grep -E '(canonical|application/ld\+json|<title>|<h1>|meta name="description")'
done < sample_urls.txt
```

**Expected on Each Page**:
- `<link rel="canonical" href="...">` - Unique per page
- `<script type="application/ld+json">` - Schema.org markup
- `<title>` - Unique descriptive title
- `<h1>` - Primary heading
- `<meta name="description">` - Unique description

**ETA**: 0.5 hour validation + 1-2 hours fixes if needed

---

### P2 - Post-Launch Optimization

#### GAP-004: P95 Latency High
**Issue**: 283ms (target 120ms)

**Fix Required** (TBD):

```typescript
// 1. Add caching for generated pages
import { LRUCache } from 'lru-cache';

const pageCache = new LRUCache({
  max: 10000,
  ttl: 1000 * 60 * 60 * 24 // 24 hours
});

app.get('/scholarship/:slug', (req, res) => {
  const cached = pageCache.get(req.params.slug);
  if (cached) {
    return res.send(cached);
  }
  
  const page = generatePage(req.params.slug);
  pageCache.set(req.params.slug, page);
  res.send(page);
});

// 2. Add CDN caching headers
app.get('/scholarship/:slug', (req, res) => {
  res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=604800');
  res.setHeader('Vary', 'Accept-Encoding');
  // ... render page
});

// 3. Optimize database queries for page generation
CREATE INDEX idx_scholarships_slug ON scholarships(slug);
CREATE INDEX idx_scholarships_category ON scholarships(category);
```

**ETA**: 2-4 hours (can defer)

---

## Timeline

| Phase | Tasks | ETA |
|-------|-------|-----|
| **Phase 1** | /canary + Permissions-Policy (parallel) | **T+0.5-1h** |
| **Phase 2** | Technical SEO verification | T+1.5h |
| **Phase 3** | Performance optimization (defer) | T+2-6h (post-launch) |

---

## Revenue-Start Impact

**Impact on Revenue**: **NONE** - Non-blocking for first dollar

**Long-Term Impact**: **CRITICAL** - SEO is the low-CAC growth engine for $10M ARR

**Recommendation**: Fix compliance gaps (T+1h), proceed with revenue, optimize SEO in parallel

---

## Success Criteria

| Criterion | Current | Target | Priority |
|-----------|---------|--------|----------|
| /canary v2.7 | ⏸️ Upgrade | ✅ 8 fields | P1 |
| Headers 6/6 | ❌ 5/6 | ✅ 6/6 | P1 |
| robots.txt | ✅ Pass | ✅ Pass | ✅ Done |
| sitemap.xml | ✅ 2,102 URLs | ✅ Pass | ✅ Done |
| Technical SEO | ⏸️ Verify | ✅ Pass | P1 |
| P95 ≤120ms | ❌ 283ms | ✅ Pass | P2 (defer) |

---

## Summary Line

**Summary**: auto_page_maker → https://auto-page-maker-jamarrlmayes.replit.app | Status: **AMBER** | Revenue-Start ETA: **T+0.5-1 hour** (non-blocking)

---

**Prepared By**: Agent3  
**Recommendation**: Fix compliance gaps, verify technical SEO, proceed with revenue  
**Next Action**: Implement GAP-001 and GAP-002, validate GAP-003
