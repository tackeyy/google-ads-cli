import type { Command } from "commander";
import { buildConfig } from "../../lib/config.js";
import { GadsClient } from "../../lib/client.js";

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
export function checkBudgets(
  campaigns: CampaignBudgetInfo[],
  thresholdYen: number
): BudgetCheckResult {
  const active = campaigns.filter((c) => c.status !== "REMOVED");
  const alerts: BudgetAlert[] = [];
  const ok: CampaignBudgetInfo[] = [];

  for (const c of active) {
    const budgetYen = Math.round(c.budgetMicros / 1_000_000);

    if (c.isUnlimited || c.budgetMicros === 0) {
      alerts.push({ id: c.id, name: c.name, reason: "unlimited", budgetYen: 0 });
    } else if (budgetYen > thresholdYen) {
      alerts.push({ id: c.id, name: c.name, reason: "over_threshold", budgetYen });
    } else {
      ok.push(c);
    }
  }

  return { hasAlert: alerts.length > 0, alerts, ok };
}

export function registerBudgetCheckCommand(program: Command) {
  program
    .command("budget-check")
    .description("予算上限未設定または閾値超過のキャンペーンを検出する")
    .option("--threshold <yen>", "日次予算の警告閾値（円）", "10000")
    .option("--json", "JSON形式で出力")
    .action(async (opts) => {
      const thresholdYen = parseInt(opts.threshold, 10);
      if (isNaN(thresholdYen) || thresholdYen < 0) {
        console.error("❌ --threshold には正の整数を指定してください");
        process.exit(1);
      }

      try {
        const config = buildConfig(process.env as Record<string, string>);
        const client = new GadsClient(config);
        const campaigns = await client.listCampaignBudgets();
        const result = checkBudgets(campaigns, thresholdYen);

        if (opts.json) {
          console.log(
            JSON.stringify(
              {
                hasAlert: result.hasAlert,
                thresholdYen,
                alerts: result.alerts,
                ok: result.ok.map((c) => ({
                  id: c.id,
                  name: c.name,
                  budgetYen: Math.round(c.budgetMicros / 1_000_000),
                })),
              },
              null,
              2
            )
          );
          process.exit(result.hasAlert ? 1 : 0);
        }

        if (!result.hasAlert) {
          console.log("\x1b[32m✅ 全キャンペーンに予算上限が設定されています\x1b[0m");
          process.exit(0);
        }

        console.log(
          `\x1b[33m⚠️  予算上限未設定または上限超過のキャンペーン（閾値: ¥${thresholdYen.toLocaleString()}/日）:\x1b[0m`
        );
        for (const alert of result.alerts) {
          if (alert.reason === "unlimited") {
            console.log(`  \x1b[31m• ${alert.name} (ID: ${alert.id}) — 予算上限未設定（unlimited）\x1b[0m`);
          } else {
            console.log(
              `  \x1b[33m• ${alert.name} (ID: ${alert.id}) — ¥${alert.budgetYen.toLocaleString()}/日（閾値超過）\x1b[0m`
            );
          }
        }

        if (result.ok.length > 0) {
          console.log(`\n\x1b[32m✅ 正常なキャンペーン: ${result.ok.length}件\x1b[0m`);
        }

        process.exit(1);
      } catch (err) {
        console.error("❌ エラー:", err instanceof Error ? err.message : err);
        process.exit(1);
      }
    });
}
