import type { Command } from "commander";
import { buildConfig } from "../../lib/config.js";
import { GadsClient } from "../../lib/client.js";

export function registerAdGroupsCommand(program: Command) {
  const adgroupsCmd = program
    .command("adgroups")
    .description("広告グループ管理");

  adgroupsCmd
    .command("enable")
    .description("広告グループを PAUSED → ENABLED に変更する")
    .requiredOption("--id <adGroupId>", "有効化する広告グループID")
    .action(async (opts) => {
      try {
        const config = buildConfig(process.env as Record<string, string>);
        const client = new GadsClient(config);
        const resourceName = await client.enableAdGroup(opts.id);
        console.log(`✅ 広告グループを ENABLED に変更しました: ${resourceName}`);
      } catch (err) {
        console.error("❌ エラー:", err instanceof Error ? err.message : err);
        process.exit(1);
      }
    });
}
