-- AGENT3_HANDSHAKE v27 Phase 4: Monetization Readiness Database Evidence
-- Captured: 2026-01-08T19:50:00Z
-- Source: Development PostgreSQL Database

-- Query 1: Credit Ledger Summary
-- Result: type | count | total
-- purchase | 80 | 4000000
-- adjustment | 1 | 5000
-- refund | 2 | 100000
SELECT type, COUNT(*) as count, SUM(amount_millicredits) as total 
FROM credit_ledger 
GROUP BY type;

-- Query 2: Unique Users with Credit Activity
-- Result: user_id
-- trial-test-user-DUTokS
-- (Only 1 user with any credit activity)
SELECT DISTINCT user_id FROM credit_ledger;

-- Query 3: User Analysis
-- Result: 7 users, 0 with stripe_customer_id
SELECT 
  COUNT(*) as total_users, 
  COUNT(CASE WHEN stripe_customer_id IS NOT NULL THEN 1 END) as with_stripe 
FROM users;

-- Query 4: User Breakdown
-- id | email | subscription_status | stripe_customer_id | created_at
-- trial-test-user-DUTokS | newstudent-fmN4Eb@example.com | inactive | NULL | 2025-12-17
-- visual-check-user | realuser@scholarlink.com | inactive | NULL | 2025-12-16
-- ui-validation-user | validation@real-user.com | inactive | NULL | 2025-12-16
-- e2e-success | success@scholarlink.app | inactive | NULL | 2025-10-17
-- e2e-final-validated | validated@scholarlink.app | inactive | NULL | 2025-10-17
-- nwiKs- | final-_YRd_@canary.prod | inactive | NULL | 2025-10-08
-- 42600777 | jamarrlmayes@gmail.com | inactive | NULL | 2025-08-19
SELECT id, email, subscription_status, stripe_customer_id, created_at 
FROM users 
ORDER BY created_at DESC;

-- Query 5: Debit Verification (AI Usage)
-- Result: 0 rows (no AI usage)
SELECT * FROM credit_ledger WHERE type = 'debit';

-- CONCLUSION:
-- - 7 total users (1 real: 42600777/jamarrlmayes@gmail.com, 6 test accounts)
-- - 0 users linked to Stripe (stripe_customer_id is NULL for all)
-- - 80 purchase entries totaling 4,000 credits (all synthetic to trial-test-user-DUTokS)
-- - 0 debit entries = 0% AI feature usage
-- - Root cause: Activation failure - users not finding/using Essay Assistant
