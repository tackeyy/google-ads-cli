import type { Command } from "commander";
import { buildConfig } from "../../lib/config.js";
import { GadsClient } from "../../lib/client.js";

export function registerCampaignsCommand(program: Command) {
  const campaignsCmd = program
    .command("campaigns")
    .description("キャンペーン管理")
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

  campaignsCmd
    .command("enable")
    .description("キャンペーンを PAUSED → ENABLED に変更する（配下の広告グループ・広告も一括有効化）")
    .requiredOption("--id <campaignId>", "有効化するキャンペーンID")
    .action(async (opts) => {
      try {
        const config = buildConfig(process.env as Record<string, string>);
        const client = new GadsClient(config);

        // 1. キャンペーン自体を ENABLED に変更
        const campaignRn = await client.enableCampaign(opts.id);
        console.log(`✅ キャンペーンを ENABLED に変更しました: ${campaignRn}`);

        // 2. 配下の広告グループをすべて ENABLED に変更
        const adGroupIds = await client.listAdGroupIdsByCampaign(opts.id);
        if (adGroupIds.length > 0) {
          for (const agId of adGroupIds) {
            const agRn = await client.enableAdGroup(agId);
            console.log(`✅ 広告グループを ENABLED に変更しました: ${agRn}`);
          }
        } else {
          console.log("ℹ️  配下の広告グループなし");
        }

        // 3. 配下の広告をすべて ENABLED に変更
        const adCompositeIds = await client.listAdCompositeIdsByCampaign(opts.id);
        if (adCompositeIds.length > 0) {
          const adRns = await client.enableAds(adCompositeIds);
          for (const rn of adRns) {
            console.log(`✅ 広告を ENABLED に変更しました: ${rn}`);
          }
        } else {
          console.log("ℹ️  配下の広告なし");
        }
      } catch (err) {
        console.error("❌ エラー:", err instanceof Error ? err.message : err);
        process.exit(1);
      }
    });
}
