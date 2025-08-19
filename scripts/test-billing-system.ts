import { billingService } from "../server/billing";
import { db } from "../server/db";
import { creditBalances, users } from "@shared/schema";
import { eq } from "drizzle-orm";

// Test script to verify billing system functionality
// Based on the comprehensive test checklist provided

const TEST_USER_ID = "test_user_42600777";

interface TestResult {
  name: string;
  passed: boolean;
  expected: string;
  actual: string;
  error?: string;
}

const results: TestResult[] = [];

function addResult(name: string, passed: boolean, expected: string, actual: string, error?: string) {
  results.push({ name, passed, expected, actual, error });
  const status = passed ? "✅ PASS" : "❌ FAIL";
  console.log(`${status} ${name}: Expected ${expected}, Got ${actual}${error ? ` (${error})` : ''}`);
}

async function setupTestUser() {
  console.log("🔧 Setting up test user...");
  
  // Ensure test user has a balance record
  await db.insert(creditBalances).values({
    userId: TEST_USER_ID,
    balanceMillicredits: BigInt(10000000), // 10,000 credits
  }).onConflictDoUpdate({
    target: creditBalances.userId,
    set: {
      balanceMillicredits: BigInt(10000000),
      updatedAt: new Date(),
    },
  });
  
  console.log("✅ Test user setup complete");
}

async function testA_GptOMini_1k_1k() {
  console.log("\n📋 Test A: gpt-4o-mini, 1,000 in, 1,000 out");
  console.log("Expected: 2.4 + 9.6 = 12.0 credits charged");
  
  try {
    const result = await billingService.chargeForUsage(
      TEST_USER_ID,
      "gpt-4o-mini",
      1000,
      1000,
      "test-request-a"
    );
    
    const chargedCredits = Number(result.chargedMillicredits) / 1000;
    addResult("Test A", Math.abs(chargedCredits - 12.0) < 0.01, "12.0 credits", `${chargedCredits} credits`);
    
  } catch (error) {
    addResult("Test A", false, "12.0 credits", "Error", error.message);
  }
}

async function testB_GptO_10k_2k() {
  console.log("\n📋 Test B: gpt-4o, 10,000 in, 2,000 out");
  console.log("Expected: (10 * 10) + (2 * 40) = 100 + 80 = 180 credits");
  
  try {
    const result = await billingService.chargeForUsage(
      TEST_USER_ID,
      "gpt-4o",
      10000,
      2000,
      "test-request-b"
    );
    
    const chargedCredits = Number(result.chargedMillicredits) / 1000;
    addResult("Test B", Math.abs(chargedCredits - 180.0) < 0.01, "180.0 credits", `${chargedCredits} credits`);
    
  } catch (error) {
    addResult("Test B", false, "180.0 credits", "Error", error.message);
  }
}

async function testC_GptOMini_Fractional() {
  console.log("\n📋 Test C: gpt-4o-mini, 750 in, 200 out (fractional tokens)");
  console.log("Expected: (0.75 * 0.6) + (0.2 * 2.4) = 0.45 + 0.48 = 0.93 credits");
  
  try {
    const result = await billingService.chargeForUsage(
      TEST_USER_ID,
      "gpt-4o-mini",
      750,
      200,
      "test-request-c"
    );
    
    const chargedCredits = Number(result.chargedMillicredits) / 1000;
    const expected = 0.93; // (750/1000 * 0.0006) + (200/1000 * 0.0024) = 0.00045 + 0.00048 = 0.00093 USD = 0.93 credits
    addResult("Test C", Math.abs(chargedCredits - expected) < 0.01, `${expected} credits`, `${chargedCredits} credits`);
    
  } catch (error) {
    addResult("Test C", false, "0.93 credits", "Error", error.message);
  }
}

async function testD_GptO_Fractional() {
  console.log("\n📋 Test D: gpt-4o, 1,234 in, 567 out (fractional tokens)");
  console.log("Expected: (1.234 * 10) + (0.567 * 40) = 12.34 + 22.68 = 35.02 credits");
  
  try {
    const result = await billingService.chargeForUsage(
      TEST_USER_ID,
      "gpt-4o",
      1234,
      567,
      "test-request-d"
    );
    
    const chargedCredits = Number(result.chargedMillicredits) / 1000;
    const expected = 35.02; // (1234/1000 * 0.01) + (567/1000 * 0.04) = 0.01234 + 0.02268 = 0.03502 USD = 35.02 credits
    addResult("Test D", Math.abs(chargedCredits - expected) < 0.01, `${expected} credits`, `${chargedCredits} credits`);
    
  } catch (error) {
    addResult("Test D", false, "35.02 credits", "Error", error.message);
  }
}

async function testInsufficientCredits() {
  console.log("\n📋 Test E: Insufficient Credits");
  console.log("Setting balance to 1 credit, trying to use gpt-4o which costs ~50+ credits");
  
  try {
    // Set very low balance
    await db
      .update(creditBalances)
      .set({ balanceMillicredits: BigInt(1000) }) // 1 credit
      .where(eq(creditBalances.userId, TEST_USER_ID));
    
    await billingService.chargeForUsage(
      TEST_USER_ID,
      "gpt-4o",
      1000,
      1000,
      "test-request-insufficient"
    );
    
    addResult("Test E", false, "PaymentRequiredError", "No error thrown");
    
  } catch (error) {
    const isCorrectError = error.name === "PaymentRequiredError" || error.message.includes("Insufficient credits");
    addResult("Test E", isCorrectError, "PaymentRequiredError", error.name || error.message);
  }
}

async function testCostEstimation() {
  console.log("\n📋 Test F: Cost Estimation");
  console.log("Estimating cost for gpt-4o: 1000 in, 500 out tokens");
  
  try {
    const estimate = await billingService.estimateCharge("gpt-4o", 1000, 500);
    const expected = 30.0; // (1 * 10) + (0.5 * 40) = 10 + 20 = 30 credits
    
    addResult("Test F", Math.abs(estimate.creditsRequired - expected) < 0.01, 
      `${expected} credits`, `${estimate.creditsRequired} credits`);
    
    console.log(`  💡 Breakdown: Input=${estimate.breakdown.inputCost}, Output=${estimate.breakdown.outputCost}`);
    console.log(`  💰 USD Equivalent: $${estimate.usdEquivalent.toFixed(4)}`);
    
  } catch (error) {
    addResult("Test F", false, "30.0 credits", "Error", error.message);
  }
}

async function testBillingSummary() {
  console.log("\n📋 Test G: Billing Summary API");
  
  try {
    // Restore test user balance for summary test
    await db
      .update(creditBalances)
      .set({ balanceMillicredits: BigInt(5000000) }) // 5,000 credits
      .where(eq(creditBalances.userId, TEST_USER_ID));
    
    const summary = await billingService.getUserBillingSummary(TEST_USER_ID);
    
    const hasCurrentBalance = typeof summary.currentBalance === 'number';
    const hasPackages = Array.isArray(summary.packages) && summary.packages.length > 0;
    const hasRateCard = Array.isArray(summary.rateCard) && summary.rateCard.length > 0;
    
    addResult("Test G - Current Balance", hasCurrentBalance, "number", typeof summary.currentBalance);
    addResult("Test G - Packages", hasPackages, "3 packages", `${summary.packages?.length || 0} packages`);
    addResult("Test G - Rate Card", hasRateCard, ">0 models", `${summary.rateCard?.length || 0} models`);
    
    console.log(`  💰 Current Balance: ${summary.currentBalance} credits`);
    console.log(`  📦 Packages: ${summary.packages?.map(p => p.code).join(', ')}`);
    console.log(`  🏷️  Rate Card Models: ${summary.rateCard?.map(r => r.model).join(', ')}`);
    
  } catch (error) {
    addResult("Test G", false, "Valid summary", "Error", error.message);
  }
}

async function testLedgerAndUsage() {
  console.log("\n📋 Test H: Ledger and Usage History");
  
  try {
    const ledger = await billingService.getUserLedger(TEST_USER_ID, 10);
    const usage = await billingService.getUserUsage(TEST_USER_ID, 10);
    
    const hasLedgerEntries = Array.isArray(ledger.entries);
    const hasUsageEntries = Array.isArray(usage.entries);
    
    addResult("Test H - Ledger", hasLedgerEntries, "array", typeof ledger.entries);
    addResult("Test H - Usage", hasUsageEntries, "array", typeof usage.entries);
    
    console.log(`  📊 Ledger Entries: ${ledger.entries?.length || 0}`);
    console.log(`  ⚡ Usage Entries: ${usage.entries?.length || 0}`);
    
    // Check for BigInt serialization issues
    if (ledger.entries && ledger.entries.length > 0) {
      const firstEntry = ledger.entries[0];
      const hasNumbers = typeof firstEntry.amount === 'number' && typeof firstEntry.balanceAfter === 'number';
      addResult("Test H - BigInt Conversion", hasNumbers, "numbers", "BigInt values");
    }
    
  } catch (error) {
    addResult("Test H", false, "Valid history", "Error", error.message);
  }
}

async function printSummary() {
  console.log("\n" + "=".repeat(60));
  console.log("📋 BILLING SYSTEM TEST SUMMARY");
  console.log("=".repeat(60));
  
  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  const passRate = ((passed / total) * 100).toFixed(1);
  
  console.log(`\n🎯 Overall Result: ${passed}/${total} tests passed (${passRate}%)`);
  
  if (passed === total) {
    console.log("\n🎉 ALL TESTS PASSED! Billing system is working correctly.");
  } else {
    console.log("\n⚠️  Some tests failed. Review the details above.");
    
    console.log("\n❌ Failed Tests:");
    results.filter(r => !r.passed).forEach(r => {
      console.log(`   - ${r.name}: ${r.error || 'Expected ' + r.expected + ', got ' + r.actual}`);
    });
  }
  
  console.log("\n🔧 Rate Card Summary (4x OpenAI markup):");
  console.log("   - gpt-4o: $0.01 input, $0.04 output per 1K tokens");
  console.log("   - gpt-4o-mini: $0.0006 input, $0.0024 output per 1K tokens");
  console.log("   - Credit packages: $9.99, $49.99, $99.99 (with bonuses)");
  
  console.log("\n📊 Next Steps for Production:");
  console.log("   1. Set up Stripe webhook endpoint with proper secret");
  console.log("   2. Test actual Stripe checkout flow end-to-end");
  console.log("   3. Configure rate limiting and concurrency controls");
  console.log("   4. Set up monitoring and alerting for billing events");
  console.log("   5. Add auto-recharge and low-balance notifications");
}

async function runAllTests() {
  console.log("🧪 Starting Comprehensive Billing System Tests");
  console.log("Based on the provided test checklist\n");
  
  try {
    await setupTestUser();
    await testA_GptOMini_1k_1k();
    await testB_GptO_10k_2k();
    await testC_GptOMini_Fractional();
    await testD_GptO_Fractional();
    await testInsufficientCredits();
    await testCostEstimation();
    await testBillingSummary();
    await testLedgerAndUsage();
    await printSummary();
    
  } catch (error) {
    console.error("❌ Test suite failed:", error);
  }
}

// Auto-run when script is executed
runAllTests()
  .then(() => {
    console.log("\n✅ Test suite completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Test suite crashed:", error);
    process.exit(1);
  });

export { runAllTests };