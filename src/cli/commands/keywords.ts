import { readFile } from "node:fs/promises";
import type { Command } from "commander";
import { buildConfig } from "../../lib/config.js";
import { GadsClient } from "../../lib/client.js";
import {
  buildHistoricalMetricsRequest,
  normalizeKeywordVolumeInput,
  parseHistoricalMetricsResponse,
} from "../../lib/keywords.js";

export function registerKeywordsCommand(program: Command) {
  program.command("keywords")
    .description("キーワードの検索量を取得する")
    .command("volume")
    .description("既存キーワードの月間検索量を読み取る")
    .option("--keyword <語>", "取得する語（繰り返し可）", (word: string, words: string[]) => [...words, word], [])
    .option("--file <path>", "1行1語のUTF-8ファイル")
    .option("--geo <id>", "地域ID", "2392")
    .option("--language <id>", "言語ID", "1005")
    .option("--network <network>", "検索ネットワーク", "GOOGLE_SEARCH")
    .option("--from <YYYY-MM>", "開始月")
    .option("--to <YYYY-MM>", "終了月")
    .option("--json", "JSON形式で出力")
    .action(async (opts) => {
      try {
        const fileWords = opts.file ? (await readFile(opts.file, "utf8")).split(/\r?\n/) : [];
        const input = normalizeKeywordVolumeInput({ ...opts, keywords: [...opts.keyword, ...fileWords] });
        const client = new GadsClient(buildConfig(process.env as Record<string, string>));
        const response = await client.generateKeywordHistoricalMetrics(buildHistoricalMetricsRequest(input));
        const parsed = parseHistoricalMetricsResponse(response, input, new Date());
        if (opts.json) {
          console.log(JSON.stringify(parsed, null, 2));
          return;
        }
        console.log(`地域: ${parsed.criteria.geoTargetConstant} / 言語: ${parsed.criteria.language}`);
        console.log(`ネットワーク: ${input.network} / 期間: ${input.from ?? "API既定"} 〜 ${input.to ?? "API既定"}`);
        console.log("検索数はGoogleの推計です。近似語が同じ結果に統合される場合があります。");
        console.log("キーワード\t平均月間検索数\t競合度");
        for (const row of parsed.results) {
          const words = row.requestedKeywords.length ? row.requestedKeywords : [row.text ?? "未取得"];
          for (const word of words) {
            console.log(`${word}\t${row.avgMonthlySearches ?? "未取得"}\t${row.competition ?? "未取得"}`);
          }
        }
        if (parsed.notReturned.length) console.log(`未取得の語: ${parsed.notReturned.join("、")}`);
      } catch (err) {
        console.error("エラー:", err instanceof Error ? err.message : err);
        process.exit(1);
      }
    });
}
