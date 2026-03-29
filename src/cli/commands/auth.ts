import type { Command } from "commander";
import { buildConfig, maskToken } from "../../lib/config.js";
import { GadsClient } from "../../lib/client.js";

export function registerAuthCommand(program: Command) {
  const auth = program.command("auth").description("認証管理");

  auth
    .command("test")
    .description("認証情報を確認する")
    .action(async () => {
      try {
        const config = buildConfig(process.env as Record<string, string>);
        console.log("認証情報チェック中...");
        console.log(`  Developer Token: ${maskToken(config.developerToken)}`);
        console.log(`  Client ID: ${maskToken(config.clientId)}`);
        console.log(`  Refresh Token: ${maskToken(config.refreshToken)}`);
        console.log(`  Customer ID: ${config.customerId}`);

        const client = new GadsClient(config);
        const account = await client.authTest();
        console.log("\n✅ 認証成功");
        console.log(`  Customer ID: ${account.customerId}`);
        console.log(`  通貨: ${account.currencyCode}`);
        console.log(`  タイムゾーン: ${account.timeZone}`);
      } catch (err) {
        console.error("❌ 認証失敗:", err instanceof Error ? err.message : err);
        process.exit(1);
      }
    });
}
