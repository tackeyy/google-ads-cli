import type { Command } from "commander";
export interface CampaignBudgetInfo {
    id: string;
    name: string;
    status: string;
    budgetMicros: number;
    isUnlimited: boolean;
}
export interface BudgetAlert {
    id: string;
    name: string;
    reason: "unlimited" | "over_threshold";
    budgetYen: number;
}
export interface BudgetCheckResult {
    hasAlert: boolean;
    alerts: BudgetAlert[];
    ok: CampaignBudgetInfo[];
}
/**
 * 予算チェックのコアロジック（テスト可能な純粋関数）
 * - REMOVED キャンペーンは除外
 * - isUnlimited: true → unlimited アラート
 * - budgetYen > thresholdYen → over_threshold アラート
 */
export declare function checkBudgets(campaigns: CampaignBudgetInfo[], thresholdYen: number): BudgetCheckResult;
export declare function registerBudgetCheckCommand(program: Command): void;
//# sourceMappingURL=budget-check.d.ts.map