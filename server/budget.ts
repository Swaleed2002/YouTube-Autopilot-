/**
 * Faceless Autopilot - Budget & Cost Tracking Manager
 * Monthly ceiling: AED 500 (~$136.14 USD)
 * Warning threshold: 80% (AED 400)
 * Hard ceiling cutoff: 100% (AED 500)
 */

import { db, ApiUsageRecord } from './db.js';
import crypto from 'crypto';

const AED_PER_USD = 3.6725;
const MONTHLY_CEILING_AED = 500;
const WARNING_THRESHOLD_AED = 400;

export class BudgetManager {
  /**
   * Check if current month has rolled over, resetting ledger if needed
   */
  public static checkMonthRollover(): void {
    const currentMonth = new Date().toISOString().slice(0, 7);
    db.update((state) => {
      if (state.budget.currentMonth !== currentMonth) {
        state.budget.currentMonth = currentMonth;
        state.budget.totalSpentAed = 0;
        state.budget.totalSpentUsd = 0;
        state.budget.isSuspended = false;
        state.budget.isWarningSent = false;
        state.budget.records = [];
        db.log('BUDGET', `New month rollover initiated for ${currentMonth}. Monthly ceiling reset to AED ${MONTHLY_CEILING_AED}.`, 'info');
      }
    });
  }

  /**
   * Record actual usage and calculate costs in AED & USD
   */
  public static recordUsage(params: {
    service: 'gemini' | 'tts' | 'render' | 'youtube';
    operation: string;
    tokens?: number;
    durationSeconds?: number;
    videoId?: string;
  }): { costAed: number; isSuspended: boolean } {
    this.checkMonthRollover();

    let costUsd = 0;

    switch (params.service) {
      case 'gemini': {
        // Gemini 3.8 Flash pricing: Free tier up to standard rate limit.
        // Paid rate fallback: $0.075 / 1M prompt tokens, $0.30 / 1M output tokens (~$0.00015 / 1K tokens average).
        const tokens = params.tokens || 1000;
        costUsd = (tokens / 1_000_000) * 0.18;
        break;
      }
      case 'tts': {
        // Edge TTS is free; Gemini Flash Lite TTS fallback is $0.00001 / second of generated speech
        const duration = params.durationSeconds || 30;
        costUsd = duration * 0.000015;
        break;
      }
      case 'render': {
        // Cloud rendering computation cost estimation (~$0.0005 per render second)
        const duration = params.durationSeconds || 60;
        costUsd = duration * 0.0002;
        break;
      }
      case 'youtube': {
        // YouTube Data API v3 operations (Quota points free tier)
        costUsd = 0.0;
        break;
      }
    }

    const costAed = Math.round(costUsd * AED_PER_USD * 10000) / 10000;

    const record: ApiUsageRecord = {
      id: `rec_${crypto.randomUUID().slice(0, 8)}`,
      timestamp: new Date().toISOString(),
      service: params.service,
      operation: params.operation,
      tokens: params.tokens,
      durationSeconds: params.durationSeconds,
      costAed,
      costUsd,
      videoId: params.videoId,
    };

    let isSuspended = false;
    let shouldWarn = false;

    db.update((state) => {
      state.budget.records.unshift(record);
      // Keep last 300 records
      if (state.budget.records.length > 300) {
        state.budget.records = state.budget.records.slice(0, 300);
      }

      state.budget.totalSpentAed = Math.round((state.budget.totalSpentAed + costAed) * 100) / 100;
      state.budget.totalSpentUsd = Math.round((state.budget.totalSpentAed / AED_PER_USD) * 100) / 100;

      if (state.budget.totalSpentAed >= MONTHLY_CEILING_AED) {
        state.budget.isSuspended = true;
        isSuspended = true;
      } else if (state.budget.totalSpentAed >= WARNING_THRESHOLD_AED && !state.budget.isWarningSent) {
        state.budget.isWarningSent = true;
        shouldWarn = true;
      }
    });

    if (isSuspended) {
      db.log('BUDGET', `MONTHLY BUDGET CEILING REACHED (AED ${MONTHLY_CEILING_AED}). Automated video generation suspended.`, 'error');
    } else if (shouldWarn) {
      db.log('BUDGET', `WARNING: Monthly budget at 80% (AED ${WARNING_THRESHOLD_AED} / ${MONTHLY_CEILING_AED}). Prioritizing free operations.`, 'warning');
    }

    return { costAed, isSuspended };
  }

  /**
   * Check if budget allows running a new job
   */
  public static canExecuteJob(): { allowed: boolean; reason?: string } {
    this.checkMonthRollover();
    const state = db.get().budget;

    if (state.isSuspended || state.totalSpentAed >= MONTHLY_CEILING_AED) {
      return {
        allowed: false,
        reason: `Monthly budget ceiling of AED ${MONTHLY_CEILING_AED} reached. Currently at AED ${state.totalSpentAed.toFixed(2)}.`,
      };
    }

    return { allowed: true };
  }

  /**
   * Estimate cost for a video prior to production
   */
  public static estimateVideoCost(format: 'short' | 'long'): number {
    if (format === 'short') {
      // 30-60s Short: ~2,500 tokens + ~45s audio + render
      return 0.12; // AED
    } else {
      // 5-8min Long video: ~9,000 tokens + ~360s audio + render
      return 0.85; // AED
    }
  }

  public static getBudgetSummary() {
    this.checkMonthRollover();
    const b = db.get().budget;
    const remainingAed = Math.max(0, MONTHLY_CEILING_AED - b.totalSpentAed);
    const percentage = Math.min(100, (b.totalSpentAed / MONTHLY_CEILING_AED) * 100);

    return {
      monthlyCeilingAed: MONTHLY_CEILING_AED,
      totalSpentAed: b.totalSpentAed,
      remainingAed: Math.round(remainingAed * 100) / 100,
      totalSpentUsd: b.totalSpentUsd,
      percentage: Math.round(percentage * 10) / 10,
      isSuspended: b.isSuspended,
      isWarning: percentage >= 80,
      currentMonth: b.currentMonth,
      recordCount: b.records.length,
      recentRecords: b.records.slice(0, 20),
    };
  }
}
