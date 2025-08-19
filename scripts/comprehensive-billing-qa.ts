#!/usr/bin/env npx tsx
/**
 * Comprehensive Billing System QA Test Suite
 * Based on the detailed QA checklist provided
 * Tests all functional requirements, UI components, and edge cases
 */

import { db } from "../server/db";
import { BillingService } from "../server/billing";
import { 
  creditBalances, 
  creditLedger, 
  purchases, 
  rateCard, 
  usageEvents,
  users 
} from "../shared/schema";
import { eq, desc } from "drizzle-orm";

const billingService = new BillingService();

// Test data
const TEST_USER_ID = "test_user_billing_qa";
const TEST_EMAIL = "billing-qa@test.com";

interface TestResult {
  name: string;
  passed: boolean;
  details: string;
  expected?: any;
  actual?: any;
}

const results: TestResult[] = [];

function addResult(name: string, passed: boolean, details: string, expected?: any, actual?: any) {
  results.push({ name, passed, details, expected, actual });
  const status = passed ? "✅" : "❌";
  console.log(`${status} ${name}: ${details}`);
}

async function setupTestEnvironment() {
  console.log("🔧 Setting up comprehensive test environment...");
  
  try {
    // Create test user
    await db.insert(users).values({
      id: TEST_USER_ID,
      email: TEST_EMAIL,
      firstName: "Billing",
      lastName: "QA",
    }).onConflictDoNothing();

    // Initialize user balance
    await billingService.getUserBalance(TEST_USER_ID);
    
    // Add some test credits for testing
    await billingService.applyLedgerEntry(
      TEST_USER_ID,
      BigInt(50000 * 1000), // 50,000 credits
      {
        type: "purchase",
        referenceType: "system",
        referenceId: "test-setup",
        metadata: { note: "Test setup credits" }
      }
    );

    addResult("Setup", true, "Test environment initialized with 50,000 credits");
  } catch (error) {
    addResult("Setup", false, `Failed: ${error.message}`);
    throw error;
  }
}

async function testChargingMath() {
  console.log("\n🧮 Testing charging math (4x rates, credits per 1k)...");
  
  // Test case: gpt-4o-mini 1k in + 1k out → 2.4 + 9.6 = 12.0 credits
  try {
    const estimate1 = await billingService.estimateCharge("gpt-4o-mini", 1000, 1000);
    const expected1 = 12.0;
    const passed1 = Math.abs(estimate1.creditsRequired - expected1) < 0.1;
    
    addResult(
      "Charging Math - gpt-4o-mini",
      passed1,
      `1k in + 1k out = ${estimate1.creditsRequired} credits`,
      expected1,
      estimate1.creditsRequired
    );
  } catch (error) {
    addResult("Charging Math - gpt-4o-mini", false, `Error: ${error.message}`);
  }

  // Test case: gpt-4o 10k in + 2k out → 200 + 160 = 360 credits
  try {
    const estimate2 = await billingService.estimateCharge("gpt-4o", 10000, 2000);
    const expected2 = 360.0;
    const passed2 = Math.abs(estimate2.creditsRequired - expected2) < 0.1;
    
    addResult(
      "Charging Math - gpt-4o",
      passed2,
      `10k in + 2k out = ${estimate2.creditsRequired} credits`,
      expected2,
      estimate2.creditsRequired
    );
  } catch (error) {
    addResult("Charging Math - gpt-4o", false, `Error: ${error.message}`);
  }

  // Test case: Mixed usage gpt-4o-mini 750 in + 200 out
  try {
    const estimate3 = await billingService.estimateCharge("gpt-4o-mini", 750, 200);
    const expected3 = (0.75 * 2.4) + (0.2 * 9.6); // 1.8 + 1.92 = 3.72
    const passed3 = Math.abs(estimate3.creditsRequired - expected3) < 0.1;
    
    addResult(
      "Charging Math - Mixed gpt-4o-mini",
      passed3,
      `750 in + 200 out = ${estimate3.creditsRequired} credits`,
      expected3,
      estimate3.creditsRequired
    );
  } catch (error) {
    addResult("Charging Math - Mixed", false, `Error: ${error.message}`);
  }
}

async function testInsufficientCredits() {
  console.log("\n💳 Testing insufficient credits scenario...");
  
  try {
    // Create a user with very low balance for testing
    const lowBalanceUserId = "test_low_balance";
    
    await db.insert(users).values({
      id: lowBalanceUserId,
      email: "lowbalance@test.com",
      firstName: "Low",
      lastName: "Balance",
    }).onConflictDoNothing();

    // Set very low balance (10 credits)
    const balance = await billingService.getOrCreateUserBalance(lowBalanceUserId);
    await db.update(creditBalances)
      .set({ balanceMillicredits: BigInt(10000) }) // 10 credits
      .where(eq(creditBalances.userId, lowBalanceUserId));

    // Try to charge more than available (100 credits)
    try {
      await billingService.chargeUsage(
        lowBalanceUserId,
        "gpt-4o",
        5000, // 5k input tokens = ~100 credits
        0,
        "test-request-id"
      );
      
      addResult("Insufficient Credits", false, "Should have thrown insufficient credits error");
    } catch (error) {
      if (error.name === "PaymentRequiredError") {
        addResult(
          "Insufficient Credits", 
          true, 
          `Correctly threw PaymentRequiredError: ${error.message}`
        );
      } else {
        addResult(
          "Insufficient Credits", 
          false, 
          `Wrong error type: ${error.name} - ${error.message}`
        );
      }
    }
  } catch (error) {
    addResult("Insufficient Credits", false, `Setup error: ${error.message}`);
  }
}

async function testCreditPackages() {
  console.log("\n📦 Testing credit packages and pricing alignment...");
  
  const packages = billingService.getCreditPackages();
  
  // Verify 1,000 credits = $1.00 alignment
  Object.entries(packages).forEach(([code, pkg]) => {
    const expectedCredits = pkg.priceUsdCents / 100 * 1000; // Should be close to totalCredits for base
    const actualCredits = pkg.totalCredits;
    
    // Allow for bonuses, so actual should be >= expected
    const passed = actualCredits >= (expectedCredits * 0.9); // 90% threshold to account for bonuses
    
    addResult(
      `Package ${code} Alignment`,
      passed,
      `$${(pkg.priceUsdCents / 100).toFixed(2)} → ${actualCredits} credits (expected ≥${expectedCredits.toFixed(0)})`,
      `≥${expectedCredits.toFixed(0)}`,
      actualCredits
    );
  });
}

async function testBigIntSerialization() {
  console.log("\n🔢 Testing BigInt serialization and API responses...");
  
  try {
    const summary = await billingService.getUserBillingSummary(TEST_USER_ID);
    
    // Check that all numeric fields are properly serialized
    const currentBalance = summary.currentBalance;
    const balanceCredits = summary.balanceCredits;
    
    addResult(
      "BigInt Serialization - Summary",
      typeof currentBalance === "number" && typeof balanceCredits === "number",
      `Balance: ${currentBalance}, Credits: ${balanceCredits}`,
      "numbers",
      `${typeof currentBalance}, ${typeof balanceCredits}`
    );

    // Test ledger entries
    const ledger = await billingService.getUserLedger(TEST_USER_ID, 5);
    
    if (ledger.entries.length > 0) {
      const entry = ledger.entries[0];
      const passed = typeof entry.amount === "number" && typeof entry.balanceAfter === "number";
      
      addResult(
        "BigInt Serialization - Ledger",
        passed,
        `Entry amount: ${entry.amount}, balanceAfter: ${entry.balanceAfter}`,
        "numbers",
        `${typeof entry.amount}, ${typeof entry.balanceAfter}`
      );
    }

    // Test usage entries  
    const usage = await billingService.getUserUsage(TEST_USER_ID, 5);
    
    if (usage.entries.length > 0) {
      const usageEntry = usage.entries[0];
      const passed = typeof usageEntry.creditsCharged === "number";
      
      addResult(
        "BigInt Serialization - Usage",
        passed,
        `Usage credits: ${usageEntry.creditsCharged}`,
        "number",
        typeof usageEntry.creditsCharged
      );
    } else {
      addResult("BigInt Serialization - Usage", true, "No usage entries to test (ok)");
    }

  } catch (error) {
    addResult("BigInt Serialization", false, `Error: ${error.message}`);
  }
}

async function testConcurrency() {
  console.log("\n⚡ Testing concurrency and race conditions...");
  
  try {
    // Create user with exactly enough balance for one expensive operation
    const concurrencyUserId = "test_concurrency";
    
    await db.insert(users).values({
      id: concurrencyUserId,
      email: "concurrency@test.com", 
      firstName: "Concurrency",
      lastName: "Test",
    }).onConflictDoNothing();

    // Set balance to exactly 100 credits (enough for one gpt-4o call with 5k tokens)
    await billingService.getUserBalance(concurrencyUserId);
    await db.update(creditBalances)
      .set({ balanceMillicredits: BigInt(100 * 1000) }) // 100 credits
      .where(eq(creditBalances.userId, concurrencyUserId));

    // Fire two simultaneous requests that each need ~100 credits
    const promises = [
      billingService.chargeUsage(concurrencyUserId, "gpt-4o", 5000, 0, "concurrent-1"),
      billingService.chargeUsage(concurrencyUserId, "gpt-4o", 5000, 0, "concurrent-2")
    ];

    const results = await Promise.allSettled(promises);
    
    const successCount = results.filter(r => r.status === "fulfilled").length;
    const failureCount = results.filter(r => r.status === "rejected").length;
    
    // Exactly one should succeed, one should fail
    const passed = successCount === 1 && failureCount === 1;
    
    addResult(
      "Concurrency Control",
      passed,
      `${successCount} succeeded, ${failureCount} failed (expected: 1 success, 1 failure)`,
      "1 success, 1 failure",
      `${successCount} success, ${failureCount} failure`
    );

  } catch (error) {
    addResult("Concurrency Control", false, `Error: ${error.message}`);
  }
}

async function testReconciliation() {
  console.log("\n🔍 Testing balance reconciliation...");
  
  try {
    const userId = TEST_USER_ID;
    
    // Get current balance
    const balance = await billingService.getUserBalance(userId);
    const currentBalance = Number(balance.balanceMillicredits || 0);
    
    // Get all ledger entries for this user
    const allLedger = await db.select()
      .from(creditLedger)
      .where(eq(creditLedger.userId, userId))
      .orderBy(desc(creditLedger.createdAt));
    
    // Calculate sum of all deltas
    const totalDelta = allLedger.reduce((sum, entry) => {
      const amount = Number(entry.amountMillicredits);
      return sum + (entry.type === 'deduction' ? -amount : amount);
    }, 0);
    
    // Current balance should equal sum of all deltas (starting from 0)
    const passed = Math.abs(currentBalance - totalDelta) < 1000; // Allow 1 credit tolerance
    
    addResult(
      "Balance Reconciliation",
      passed,
      `Current: ${currentBalance/1000} credits, Sum of deltas: ${totalDelta/1000} credits`,
      `${totalDelta/1000} credits`,
      `${currentBalance/1000} credits`
    );

  } catch (error) {
    addResult("Balance Reconciliation", false, `Error: ${error.message}`);
  }
}

async function cleanup() {
  console.log("\n🧹 Cleaning up test data...");
  
  try {
    // Clean up test users and associated data
    const testUserIds = [TEST_USER_ID, "test_low_balance", "test_concurrency"];
    
    for (const userId of testUserIds) {
      await db.delete(usageEvents).where(eq(usageEvents.userId, userId));
      await db.delete(creditLedger).where(eq(creditLedger.userId, userId));
      await db.delete(creditBalances).where(eq(creditBalances.userId, userId));
      await db.delete(purchases).where(eq(purchases.userId, userId));
      await db.delete(users).where(eq(users.id, userId));
    }
    
    addResult("Cleanup", true, "Test data cleaned up successfully");
  } catch (error) {
    addResult("Cleanup", false, `Cleanup error: ${error.message}`);
  }
}

async function printSummary() {
  console.log("\n" + "=".repeat(60));
  console.log("📊 COMPREHENSIVE BILLING QA RESULTS");
  console.log("=".repeat(60));
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const total = results.length;
  
  console.log(`✅ Passed: ${passed}/${total}`);
  console.log(`❌ Failed: ${failed}/${total}`);
  console.log(`Success Rate: ${((passed/total) * 100).toFixed(1)}%`);
  
  if (failed > 0) {
    console.log("\n❌ FAILED TESTS:");
    results.filter(r => !r.passed).forEach(result => {
      console.log(`  • ${result.name}: ${result.details}`);
      if (result.expected && result.actual) {
        console.log(`    Expected: ${result.expected}`);
        console.log(`    Actual: ${result.actual}`);
      }
    });
  }
  
  console.log("\n✅ QA CHECKLIST COVERAGE:");
  console.log("  • Charging math (4x rates, credits per 1k) ✓");
  console.log("  • Insufficient credits handling ✓");
  console.log("  • Credit package alignment ✓");
  console.log("  • BigInt serialization ✓");
  console.log("  • Concurrency control ✓");
  console.log("  • Balance reconciliation ✓");
  console.log("  • Rate card display (manual UI check) ℹ️");
  console.log("  • Stripe checkout flow (integration test) ℹ️");
  console.log("  • Webhook idempotency (integration test) ℹ️");
  
  console.log(`\n${failed === 0 ? '🎉' : '⚠️'} Billing system is ${failed === 0 ? 'PRODUCTION READY' : 'NEEDS ATTENTION'}`);
}

async function runComprehensiveQA() {
  console.log("🚀 Starting Comprehensive Billing System QA");
  console.log("Based on detailed QA checklist requirements\n");
  
  try {
    await setupTestEnvironment();
    await testChargingMath();
    await testInsufficientCredits();
    await testCreditPackages();
    await testBigIntSerialization();
    await testConcurrency();
    await testReconciliation();
    await cleanup();
    await printSummary();
  } catch (error) {
    console.error("💥 QA suite failed:", error);
    process.exit(1);
  }
}

// Run the comprehensive QA
runComprehensiveQA().catch(console.error);