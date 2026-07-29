import type { Command } from "commander";
import { buildConfig, maskToken } from "../../lib/config.js";
import { GadsClient } from "../../lib/client.js";
import {
  readGoogleAdsRefreshToken,
  revokeGoogleOAuthToken,
} from "../../lib/oauth-revoke.js";

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

  auth
    .command("revoke")
    .description(
      "GOOGLE_ADS_REFRESH_TOKENと同じGoogle OAuth grantの関連token/scopesを失効する",
    )
    .requiredOption(
      "--confirm",
      "同じOAuth grantの関連token/scopesも失効する操作を明示的に確認する",
    )
    .action(async () => {
      try {
        const refreshToken = readGoogleAdsRefreshToken(process.env);
        const result = await revokeGoogleOAuthToken(refreshToken);
        if (result.status === "revoked") {
          console.log("Google Ads OAuth refresh token was revoked.");
        } else {
          console.log("Google Ads OAuth refresh token was already invalid.");
        }
      } catch (err) {
        console.error(
          "Google Ads OAuth token revocation failed:",
          err instanceof Error ? err.message : "unknown error",
        );
        process.exit(1);
      }
    });
}
