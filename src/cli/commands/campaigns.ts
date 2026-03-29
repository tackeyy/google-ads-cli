import type { Command } from "commander";
import { buildConfig } from "../../lib/config.js";
import { GadsClient } from "../../lib/client.js";

export function registerCampaignsCommand(program: Command) {
  program
    .command("campaigns")
    .description("キャンペーン一覧を取得する")
    .option("--json", "JSON形式で出力")
    .action(async (opts) => {
      try {
        const config = buildConfig(process.env as Record<string, string>);
        const client = new GadsClient(config);
        const campaigns = await client.listCampaigns();

        if (opts.json) {
          console.log(JSON.stringify(campaigns, null, 2));
          return;
        }

        if (campaigns.length === 0) {
          console.log("キャンペーンが見つかりません");
          return;
        }

        const maxName = Math.max(...campaigns.map((c) => c.name.length), 4);
        console.log(
          `${"ID".padEnd(12)}  ${"名前".padEnd(maxName)}  ${"ステータス".padEnd(10)}  予算`
        );
        console.log("-".repeat(maxName + 38));
        for (const c of campaigns) {
          console.log(
            `${c.id.padEnd(12)}  ${c.name.padEnd(maxName)}  ${c.status.padEnd(10)}  ${c.budget}`
          );
        }
      } catch (err) {
        console.error("❌ エラー:", err instanceof Error ? err.message : err);
        process.exit(1);
      }
    });
}
