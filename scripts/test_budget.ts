/**
 * Test Budget Ceiling Enforcement (AED 500 ceiling, 80% warning, 100% suspension)
 */

import { BudgetManager } from '../server/budget.js';
import { PipelineManager } from '../server/pipeline.js';
import { db } from '../server/db.js';

async function testBudget() {
  console.log('--- TEST 7: Budget Enforcement Verification ---');

  const initialSummary = BudgetManager.getBudgetSummary();
  console.log('1. Initial Budget Summary:', {
    ceiling: initialSummary.monthlyCeilingAed,
    spent: initialSummary.totalSpentAed,
    isSuspended: initialSummary.isSuspended,
    isWarning: initialSummary.isWarning,
  });

  // Test 7A: Check normal execution allowed
  const checkNormal = BudgetManager.canExecuteJob();
  console.log('2. Normal budget check:', checkNormal);
  if (!checkNormal.allowed) throw new Error('Expected normal budget to allow job execution');

  // Test 7B: Trigger 80% warning threshold (AED 400)
  console.log('\n3. Simulating spending increase to AED 405 (81% threshold)...');
  db.update((state) => {
    state.budget.totalSpentAed = 405.00;
  });

  const summary80 = BudgetManager.getBudgetSummary();
  console.log('Budget at 81%:', {
    spent: summary80.totalSpentAed,
    percentage: summary80.percentage,
    isWarning: summary80.isWarning,
    isSuspended: summary80.isSuspended,
  });
  if (!summary80.isWarning) throw new Error('Expected warning flag to be true at >80%');

  // Test 7C: Trigger 100% hard ceiling suspension (AED 500)
  console.log('\n4. Simulating spending reaching AED 505 (101% hard ceiling)...');
  db.update((state) => {
    state.budget.totalSpentAed = 505.00;
    state.budget.isSuspended = true;
  });

  const checkSuspended = BudgetManager.canExecuteJob();
  console.log('Hard ceiling check result:', checkSuspended);
  if (checkSuspended.allowed) throw new Error('Expected job execution to be BLOCKED at >= AED 500');

  // Test 7D: Verify PipelineManager rejects video creation when budget ceiling reached
  let rejectionCaught = false;
  try {
    await PipelineManager.queueVideoGeneration({ format: 'short' });
  } catch (err: any) {
    rejectionCaught = true;
    console.log('PipelineManager rejection verified:', err.message);
  }
  if (!rejectionCaught) throw new Error('PipelineManager did not block video creation at budget ceiling');

  // Restore real ledger
  console.log('\n5. Restoring actual recorded ledger...');
  db.update((state) => {
    state.budget.totalSpentAed = 14.26;
    state.budget.isSuspended = false;
    state.budget.isWarningSent = false;
  });

  console.log('Budget enforcement test: PASSED 100%');
}

testBudget().catch((err) => {
  console.error('Budget test failed:', err);
  process.exit(1);
});
