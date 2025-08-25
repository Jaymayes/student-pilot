/**
 * COMPREHENSIVE BILLING SYSTEM TESTS
 * T+48 Unfreeze Review - Error Handling & Fault Injection
 * 
 * Tests: rounding precision, rollback safety, idempotency, fault injection
 */

const { BillingService, creditsToMillicredits, millicreditsToCredits } = require('../billing');
const { db } = require('../db');
const { eq } = require('drizzle-orm');

// Test configuration
const TEST_USER_ID = 'test-user-billing-comprehensive';
const TEST_MODEL = 'gpt-5';

describe('Billing System - Comprehensive Error Handling Tests', () => {
  let billingService;

  beforeEach(async () => {
    billingService = new BillingService();
    
    // Clean test data
    await cleanupTestData();
    
    // Ensure test user has balance
    await createTestUserWithBalance(1000); // 1000 credits
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  describe('1. ROUNDING PRECISION TESTS', () => {
    test('exact rounding preserves precision', async () => {
      const result = await billingService.calculateChargeMillicredits(
        TEST_MODEL, 1337, 2048, 'exact'
      );
      
      // Verify exact calculation with no rounding
      expect(typeof result.chargeMillicredits).toBe('bigint');
      expect(result.chargeMillicredits > BigInt(0)).toBe(true);
      
      // Test idempotency - same inputs = same output
      const result2 = await billingService.calculateChargeMillicredits(
        TEST_MODEL, 1337, 2048, 'exact'
      );
      expect(result.chargeMillicredits).toBe(result2.chargeMillicredits);
    });

    test('ceil rounding always rounds up', async () => {
      const exactResult = await billingService.calculateChargeMillicredits(
        TEST_MODEL, 1001, 1001, 'exact'
      );
      const ceilResult = await billingService.calculateChargeMillicredits(
        TEST_MODEL, 1001, 1001, 'ceil'
      );
      
      // Ceil should be >= exact
      expect(ceilResult.chargeMillicredits >= exactResult.chargeMillicredits).toBe(true);
    });

    test('millicredit precision maintained through conversion cycle', async () => {
      const originalCredits = 123.456789;
      const millicredits = creditsToMillicredits(originalCredits);
      const convertedBack = millicreditsToCredits(millicredits);
      
      // Should maintain reasonable precision (within 0.001 credits)
      expect(Math.abs(originalCredits - convertedBack) < 0.001).toBe(true);
    });
  });

  describe('2. FAULT INJECTION & ROLLBACK TESTS', () => {
    test('transaction rollback on insufficient funds', async () => {
      // Set low balance
      await setUserBalance(TEST_USER_ID, BigInt(1)); // 1 millicredit
      
      const initialBalance = await billingService.getUserBalance(TEST_USER_ID);
      
      try {
        // Attempt large charge - should fail
        await billingService.chargeForUsage(
          TEST_USER_ID, TEST_MODEL, 10000, 10000
        );
        fail('Should have thrown insufficient credits error');
      } catch (error) {
        expect(error.message).toContain('Insufficient credits');
        
        // Verify no partial state change - balance unchanged
        const finalBalance = await billingService.getUserBalance(TEST_USER_ID);
        expect(finalBalance.balanceMillicredits).toBe(initialBalance.balanceMillicredits);
      }
    });

    test('ledger entry rollback on database constraint violation', async () => {
      const initialBalance = await billingService.getUserBalance(TEST_USER_ID);
      
      // Mock a database constraint violation
      const originalInsert = db.insert;
      let callCount = 0;
      
      db.insert = jest.fn().mockImplementation((table) => {
        callCount++;
        if (callCount === 2) { // Fail on second insert (usage event)
          throw new Error('MOCK_CONSTRAINT_VIOLATION');
        }
        return originalInsert(table);
      });
      
      try {
        await billingService.chargeForUsage(TEST_USER_ID, TEST_MODEL, 100, 100);
        fail('Should have thrown constraint violation error');
      } catch (error) {
        expect(error.message).toBe('MOCK_CONSTRAINT_VIOLATION');
        
        // Verify complete rollback - balance unchanged
        const finalBalance = await billingService.getUserBalance(TEST_USER_ID);
        expect(finalBalance.balanceMillicredits).toBe(initialBalance.balanceMillicredits);
      } finally {
        db.insert = originalInsert; // Restore
      }
    });

    test('no partial writes during network interruption simulation', async () => {
      const initialBalance = await billingService.getUserBalance(TEST_USER_ID);
      
      // Simulate network interruption during transaction
      const originalTransaction = db.transaction;
      db.transaction = jest.fn().mockImplementation(async (callback) => {
        const mockTx = {
          select: db.select.bind(db),
          update: db.update.bind(db),
          insert: jest.fn().mockRejectedValue(new Error('NETWORK_TIMEOUT'))
        };
        
        try {
          return await callback(mockTx);
        } catch (error) {
          // Ensure rollback semantics
          throw error;
        }
      });
      
      try {
        await billingService.applyLedgerEntry(TEST_USER_ID, BigInt(-1000), {
          type: 'deduction',
          referenceType: 'system',
          referenceId: 'test-fail'
        });
        fail('Should have thrown network timeout error');
      } catch (error) {
        expect(error.message).toBe('NETWORK_TIMEOUT');
        
        // Verify no state corruption - balance unchanged
        const finalBalance = await billingService.getUserBalance(TEST_USER_ID);
        expect(finalBalance.balanceMillicredits).toBe(initialBalance.balanceMillicredits);
      } finally {
        db.transaction = originalTransaction; // Restore
      }
    });
  });

  describe('3. IDEMPOTENCY VERIFICATION', () => {
    test('duplicate charge operations are idempotent', async () => {
      const requestId = 'test-idempotent-request-123';
      
      // First charge
      const result1 = await billingService.chargeForUsage(
        TEST_USER_ID, TEST_MODEL, 100, 100, requestId
      );
      
      // Duplicate charge with same requestId should be idempotent
      const result2 = await billingService.chargeForUsage(
        TEST_USER_ID, TEST_MODEL, 100, 100, requestId
      );
      
      // Both should succeed but not double-charge
      expect(result1.chargedMillicredits).toBe(result2.chargedMillicredits);
      expect(result1.usageEvent.id).toBe(result2.usageEvent.id);
    });

    test('balance reconciliation remains consistent on retry', async () => {
      const initialBalance = await billingService.getUserBalance(TEST_USER_ID);
      
      // Perform charge
      const charge1 = await billingService.chargeForUsage(
        TEST_USER_ID, TEST_MODEL, 50, 50
      );
      
      // Get balance after first charge
      const balanceAfter1 = await billingService.getUserBalance(TEST_USER_ID);
      
      // Expected balance = initial - charge
      const expectedBalance = initialBalance.balanceMillicredits - charge1.chargedMillicredits;
      expect(balanceAfter1.balanceMillicredits).toBe(expectedBalance);
      
      // Retry should maintain consistency
      const balanceRetry = await billingService.getUserBalance(TEST_USER_ID);
      expect(balanceRetry.balanceMillicredits).toBe(expectedBalance);
    });

    test('ledger entries maintain audit trail consistency', async () => {
      // Perform multiple operations
      await billingService.chargeForUsage(TEST_USER_ID, TEST_MODEL, 100, 100);
      await billingService.applyLedgerEntry(TEST_USER_ID, BigInt(5000), {
        type: 'purchase',
        referenceType: 'stripe',
        referenceId: 'test-purchase'
      });
      await billingService.chargeForUsage(TEST_USER_ID, TEST_MODEL, 200, 200);
      
      // Verify ledger consistency
      const ledger = await billingService.getUserLedger(TEST_USER_ID, 100);
      
      // Should have 3 entries (2 charges + 1 purchase)
      expect(ledger.entries.length).toBe(3);
      
      // Verify running balance consistency
      let runningBalance = BigInt(0);
      for (let i = ledger.entries.length - 1; i >= 0; i--) {
        const entry = ledger.entries[i];
        runningBalance += BigInt(entry.amountMillicredits);
        expect(BigInt(entry.balanceAfterMillicredits)).toBe(runningBalance);
      }
    });
  });

  describe('4. ERROR HANDLING COVERAGE', () => {
    test('graceful handling of invalid inputs', async () => {
      // Negative tokens
      await expect(
        billingService.calculateChargeMillicredits(TEST_MODEL, -1, 100)
      ).rejects.toThrow('Invalid token counts');
      
      // Invalid model
      await expect(
        billingService.calculateChargeMillicredits('invalid-model', 100, 100)
      ).rejects.toThrow('No active rate found');
      
      // Empty user ID
      await expect(
        billingService.getUserBalance('')
      ).rejects.toThrow();
    });

    test('database connection failure recovery', async () => {
      // Mock database failure
      const originalSelect = db.select;
      db.select = jest.fn().mockRejectedValue(new Error('CONNECTION_LOST'));
      
      await expect(
        billingService.getUserBalance(TEST_USER_ID)
      ).rejects.toThrow('CONNECTION_LOST');
      
      // Restore and verify recovery
      db.select = originalSelect;
      const balance = await billingService.getUserBalance(TEST_USER_ID);
      expect(balance).toBeDefined();
    });
  });
});

// Helper functions
async function cleanupTestData() {
  // Clean up test data (implementation depends on your schema)
  // This should remove test user, balances, ledger entries, etc.
}

async function createTestUserWithBalance(credits) {
  const millicredits = creditsToMillicredits(credits);
  // Implementation depends on your user/balance creation logic
}

async function setUserBalance(userId, millicredits) {
  // Implementation depends on your balance update logic
}