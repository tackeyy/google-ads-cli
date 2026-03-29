import { buildConfig } from "../../lib/config.js";
import { GadsClient } from "../../lib/client.js";
function defaultDateRange() {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - 30);
    const fmt = (d) => d.toISOString().slice(0, 10);
    return { from: fmt(from), to: fmt(to) };
}
export function registerInsightsCommand(program) {
    program
        .command("insights")
        .description("広告パフォーマンスを取得する")
        .option("--from <date>", "開始日 (YYYY-MM-DD)", defaultDateRange().from)
        .option("--to <date>", "終了日 (YYYY-MM-DD)", defaultDateRange().to)
        .option("--json", "JSON形式で出力")
        .action(async (opts) => {
        try {
            const config = buildConfig(process.env);
            const client = new GadsClient(config);
            const rows = await client.getInsights(opts.from, opts.to);
            if (opts.json) {
                console.log(JSON.stringify(rows, null, 2));
                return;
            }
            console.log(`期間: ${opts.from} 〜 ${opts.to}\n`);
            if (rows.length === 0) {
                console.log("データなし");
                return;
            }
            const maxName = Math.max(...rows.map((r) => r.campaignName.length), 8);
            console.log(`${"キャンペーン".padEnd(maxName)}  ${"表示回数".padStart(8)}  ${"クリック".padStart(8)}  ${"費用".padStart(10)}  CTR`);
            console.log("-".repeat(maxName + 44));
            for (const r of rows) {
                console.log(`${r.campaignName.padEnd(maxName)}  ${String(r.impressions).padStart(8)}  ${String(r.clicks).padStart(8)}  ${r.cost.padStart(10)}  ${r.ctr}`);
            }
        }
        catch (err) {
            console.error("❌ エラー:", err instanceof Error ? err.message : err);
            process.exit(1);
        }
    });
}
//# sourceMappingURL=insights.js.map