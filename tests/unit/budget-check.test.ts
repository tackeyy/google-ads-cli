import { describe, it, expect } from "vitest";
import {
  checkBudgets,
  type CampaignBudgetInfo,
  type BudgetCheckResult,
} from "../../src/cli/commands/budget-check.js";

describe("checkBudgets", () => {
  const DEFAULT_THRESHOLD = 10_000; // ¥10,000

  it("全キャンペーンに予算が設定されており閾値以下の場合はアラートなし", () => {
    const campaigns: CampaignBudgetInfo[] = [
      { id: "1", name: "キャンペーンA", status: "ENABLED", budgetMicros: 5_000_000_000, isUnlimited: false },
      { id: "2", name: "キャンペーンB", status: "ENABLED", budgetMicros: 3_000_000_000, isUnlimited: false },
    ];
    const result = checkBudgets(campaigns, DEFAULT_THRESHOLD);
    expect(result.hasAlert).toBe(false);
    expect(result.alerts).toHaveLength(0);
    expect(result.ok).toHaveLength(2);
  });

  it("予算がunlimited（0）のキャンペーンはアラートを出す", () => {
    const campaigns: CampaignBudgetInfo[] = [
      { id: "1", name: "無制限キャンペーン", status: "ENABLED", budgetMicros: 0, isUnlimited: true },
    ];
    const result = checkBudgets(campaigns, DEFAULT_THRESHOLD);
    expect(result.hasAlert).toBe(true);
    expect(result.alerts).toHaveLength(1);
    expect(result.alerts[0].reason).toBe("unlimited");
    expect(result.alerts[0].name).toBe("無制限キャンペーン");
  });

  it("日次予算が閾値を超えているキャンペーンはアラートを出す", () => {
    const campaigns: CampaignBudgetInfo[] = [
      { id: "1", name: "高予算キャンペーン", status: "ENABLED", budgetMicros: 50_000_000_000, isUnlimited: false },
    ];
    // threshold ¥10,000 → 50,000円 is over
    const result = checkBudgets(campaigns, DEFAULT_THRESHOLD);
    expect(result.hasAlert).toBe(true);
    expect(result.alerts).toHaveLength(1);
    expect(result.alerts[0].reason).toBe("over_threshold");
    expect(result.alerts[0].budgetYen).toBe(50_000);
  });

  it("閾値ちょうどはアラートなし（超過のみアラート）", () => {
    const campaigns: CampaignBudgetInfo[] = [
      { id: "1", name: "ちょうどキャンペーン", status: "ENABLED", budgetMicros: 10_000_000_000, isUnlimited: false },
    ];
    const result = checkBudgets(campaigns, DEFAULT_THRESHOLD);
    expect(result.hasAlert).toBe(false);
  });

  it("閾値を1円超えた場合はアラートあり", () => {
    const campaigns: CampaignBudgetInfo[] = [
      { id: "1", name: "超過キャンペーン", status: "ENABLED", budgetMicros: 10_001_000_000, isUnlimited: false },
    ];
    const result = checkBudgets(campaigns, DEFAULT_THRESHOLD);
    expect(result.hasAlert).toBe(true);
    expect(result.alerts[0].reason).toBe("over_threshold");
  });

  it("カスタム閾値が正しく機能する", () => {
    const campaigns: CampaignBudgetInfo[] = [
      { id: "1", name: "キャンペーンX", status: "ENABLED", budgetMicros: 5_000_000_000, isUnlimited: false },
    ];
    // threshold ¥3,000 → ¥5,000 is over
    const result = checkBudgets(campaigns, 3_000);
    expect(result.hasAlert).toBe(true);
    expect(result.alerts[0].reason).toBe("over_threshold");
    expect(result.alerts[0].budgetYen).toBe(5_000);
  });

  it("REMOVED ステータスのキャンペーンは除外する", () => {
    const campaigns: CampaignBudgetInfo[] = [
      { id: "1", name: "削除済み", status: "REMOVED", budgetMicros: 0, isUnlimited: true },
    ];
    const result = checkBudgets(campaigns, DEFAULT_THRESHOLD);
    expect(result.hasAlert).toBe(false);
    expect(result.alerts).toHaveLength(0);
  });

  it("複数のアラートが混在する場合", () => {
    const campaigns: CampaignBudgetInfo[] = [
      { id: "1", name: "正常", status: "ENABLED", budgetMicros: 5_000_000_000, isUnlimited: false },
      { id: "2", name: "無制限", status: "ENABLED", budgetMicros: 0, isUnlimited: true },
      { id: "3", name: "高予算", status: "ENABLED", budgetMicros: 100_000_000_000, isUnlimited: false },
      { id: "4", name: "削除済み", status: "REMOVED", budgetMicros: 0, isUnlimited: true },
    ];
    const result = checkBudgets(campaigns, DEFAULT_THRESHOLD);
    expect(result.hasAlert).toBe(true);
    expect(result.alerts).toHaveLength(2);
    expect(result.ok).toHaveLength(1);
  });

  it("キャンペーンが0件の場合はアラートなし", () => {
    const result = checkBudgets([], DEFAULT_THRESHOLD);
    expect(result.hasAlert).toBe(false);
    expect(result.alerts).toHaveLength(0);
    expect(result.ok).toHaveLength(0);
  });
});
