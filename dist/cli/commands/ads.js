import { buildConfig } from "../../lib/config.js";
import { GadsClient } from "../../lib/client.js";
export function registerAdsCommand(program) {
    const adsCmd = program
        .command("ads")
        .description("広告管理");
    adsCmd
        .command("enable")
        .description("広告を PAUSED → ENABLED に変更する")
        .requiredOption("--id <compositeId>", "有効化する広告ID（adGroupId~adId 形式、カンマ区切りで複数可）")
        .action(async (opts) => {
        try {
            const config = buildConfig(process.env);
            const client = new GadsClient(config);
            const ids = opts.id.split(",").map((s) => s.trim()).filter(Boolean);
            const resourceNames = await client.enableAds(ids);
            for (const rn of resourceNames) {
                console.log(`✅ 広告を ENABLED に変更しました: ${rn}`);
            }
        }
        catch (err) {
            console.error("❌ エラー:", err instanceof Error ? err.message : err);
            process.exit(1);
        }
    });
}
//# sourceMappingURL=ads.js.map