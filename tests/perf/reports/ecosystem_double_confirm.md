# Ecosystem Double Confirmation (Run 026 - Protocol v30)

**RUN_ID:** CEOSPRINT-20260113-VERIFY-ZT3G-026

## Second Confirmation (2-of-3; prefer 3-of-3)

| App | HTTP+Trace | Log Entry | A8 Correlation | Proof |
|-----|------------|-----------|----------------|-------|
| A1 | PASS | PASS | PASS | 3-of-3 |
| A2 | PASS | PASS | PASS | 3-of-3 |
| A3 | PASS | PASS | PASS | 3-of-3 |
| A4 | FAIL | - | - | 0-of-3 |
| A5 | PASS | PASS | PASS | 3-of-3 |
| A6 | FAIL | - | - | 0-of-3 |
| A7 | PASS | PASS | PASS | 3-of-3 |
| A8 | PASS | PASS | PASS | 3-of-3 |

## Functional Deep-Dive Compliance

| Requirement | Status |
|-------------|--------|
| A5 /pricing + stripe.js | VERIFIED |
| A6 /api/providers JSON | BLOCKED (404) |
| A7 /sitemap.xml 2908+ | VERIFIED |
| A8 POST+GET round-trip | VERIFIED |

## Score

| Category | Count |
|----------|-------|
| 3-of-3 PASS | 6 |
| DEGRADED | 1 (A4) |
| BLOCKED | 1 (A6) |

**Fleet:** 6/8 deployed healthy

## Verdict

WARNING: PARTIAL — A4/A6 blocked. 6/8 verified.
