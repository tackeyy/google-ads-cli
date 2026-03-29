import type { Command } from "commander";
import { buildConfig } from "../../lib/config.js";
import { GadsClient } from "../../lib/client.js";

// 日本: geo_target_constant ID = 2392
const JAPAN_GEO_TARGET_ID = 2392;
// 日本語: language_constant ID = 1005
const JAPANESE_LANGUAGE_ID = 1005;

export function registerCreateCommand(program: Command) {
  program
    .command("create-campaign")
    .description("Google広告キャンペーン・広告グループ・広告・キーワードを一括作成（PAUSED状態）")
    .action(async () => {
      try {
        const config = buildConfig(process.env as Record<string, string>);
        const client = new GadsClient(config);

        console.log("📦 Google広告キャンペーン作成を開始します...\n");

        // ── Step 1: キャンペーン予算 ──────────────────────────────
        console.log("Step 1/7: キャンペーン予算を作成中...");
        const budgetResourceName = await client.createCampaignBudget(
          "Budget_zeimu-search-wl-v1",
          1_667_000_000  // ¥1,667/日 (micros)
        );
        const budgetId = budgetResourceName.split("/").pop()!;
        console.log(`  ✅ 予算作成: ID=${budgetId}`);

        // ── Step 2: キャンペーン ──────────────────────────────────
        console.log("Step 2/7: キャンペーンを作成中...");
        const campaignResourceName = await client.createCampaign(
          "zeimu-search-wl-v1",
          budgetResourceName
        );
        const campaignId = campaignResourceName.split("/").pop()!;
        console.log(`  ✅ キャンペーン作成: ID=${campaignId}`);

        // 地域（日本）・言語（日本語）の設定
        await client.addCampaignLocation(campaignResourceName, JAPAN_GEO_TARGET_ID);
        await client.addCampaignLanguage(campaignResourceName, JAPANESE_LANGUAGE_ID);
        console.log("  ✅ 地域（日本）・言語（日本語）設定完了");

        // ── Step 3: 除外キーワード（キャンペーンレベル） ─────────────
        console.log("Step 3/7: 除外キーワードを設定中...");
        const negativeKeywords = [
          "個人",
          "個人事業主",
          "確定申告",
          "求人",
          "採用",
          "転職",
          "資格",
          "勉強",
          "試験",
        ];
        const negKwResourceNames = await client.addNegativeKeywords(campaignResourceName, negativeKeywords);
        console.log(`  ✅ 除外キーワード ${negKwResourceNames.length} 個設定完了`);

        // ── Step 4: 広告グループ1 (ag-efficiency) ─────────────────
        console.log("Step 4/7: 広告グループ1 (ag-efficiency) を作成中...");
        const adGroup1ResourceName = await client.createAdGroup("ag-efficiency", campaignResourceName);
        const adGroup1Id = adGroup1ResourceName.split("/").pop()!;
        console.log(`  ✅ 広告グループ1作成: ID=${adGroup1Id}`);

        // グループ1 キーワード（フレーズ一致）
        const group1PhraseKeywords = [
          "税理士 AI ツール",
          "会計ソフト AI",
          "税理士事務所 効率化",
          "AI 経理 ツール",
          "税理士 DX ツール",
        ];
        // グループ1 キーワード（完全一致）
        const group1ExactKeywords = [
          "税理士 月次決算 チェック 自動化",
          "会計事務所 AI 導入",
          "決算書 AI チェック",
        ];
        const kw1ResourceNames = await client.addKeywords(adGroup1ResourceName, [
          ...group1PhraseKeywords.map((text) => ({ text, matchType: "PHRASE" as const })),
          ...group1ExactKeywords.map((text) => ({ text, matchType: "EXACT" as const })),
        ]);
        console.log(`  ✅ キーワード ${kw1ResourceNames.length} 個設定完了`);

        // ── Step 5: 広告グループ2 (ag-bookkeeping) ────────────────
        console.log("Step 5/7: 広告グループ2 (ag-bookkeeping) を作成中...");
        const adGroup2ResourceName = await client.createAdGroup("ag-bookkeeping", campaignResourceName);
        const adGroup2Id = adGroup2ResourceName.split("/").pop()!;
        console.log(`  ✅ 広告グループ2作成: ID=${adGroup2Id}`);

        // グループ2 キーワード（フレーズ一致）
        const group2PhraseKeywords = [
          "仕訳 自動化 AI",
          "記帳 AI 自動",
          "月次決算 自動化",
        ];
        const kw2ResourceNames = await client.addKeywords(adGroup2ResourceName, [
          ...group2PhraseKeywords.map((text) => ({ text, matchType: "PHRASE" as const })),
        ]);
        console.log(`  ✅ キーワード ${kw2ResourceNames.length} 個設定完了`);

        // ── Step 6: 広告3本 × グループ1 ─────────────────────────
        console.log("Step 6/7: 広告グループ1に広告3本を作成中...");

        const ad1aResourceName = await client.createResponsiveSearchAd(
          adGroup1ResourceName,
          ["仕訳作業を90%削減", "2時間30分→15分に短縮", "税理士向けAI｜先行登録受付中"],
          [
            "月次決算の仕訳チェックをAIが自動処理。税理士の確認作業を最大80%削減します。",
            "freeeと連携するだけ。5分で使い始められる税理士向けAIパートナー。",
          ],
          "https://zeimu.ai/lp/?utm_source=google&utm_medium=paid_search&utm_campaign=wl-acquisition&utm_content=ad-a-efficiency"
        );
        console.log(`  ✅ 広告A (数字訴求): ${ad1aResourceName.split("/").pop()}`);

        const ad1bResourceName = await client.createResponsiveSearchAd(
          adGroup1ResourceName,
          ["スタッフ採用コストの1/10以下", "AIが月次決算チェックを代行", "税理士向けAI｜無料で先行登録"],
          [
            "200社の顧問先管理もAIがサポート。転記作業を1/5に削減した実績。",
            "ISMS認証取得済み。税理士事務所のデータを安全に処理します。",
          ],
          "https://zeimu.ai/lp/?utm_source=google&utm_medium=paid_search&utm_campaign=wl-acquisition&utm_content=ad-b-cost"
        );
        console.log(`  ✅ 広告B (コスト訴求): ${ad1bResourceName.split("/").pop()}`);

        const ad1cResourceName = await client.createResponsiveSearchAd(
          adGroup1ResourceName,
          ["税理士向けAI 先行登録受付中", "月次決算を自動化｜無料体験", "仕訳90%削減｜AIパートナー"],
          [
            "税理士の月次決算チェック・異常値検出をAIが自動化。顧問先200社分を管理。",
            "メールアドレスだけで登録可能。正式版は採用コストの1/10以下の価格予定。",
          ],
          "https://zeimu.ai/lp/?utm_source=google&utm_medium=paid_search&utm_campaign=wl-acquisition&utm_content=ad-c-earlyaccess"
        );
        console.log(`  ✅ 広告C (先行登録訴求): ${ad1cResourceName.split("/").pop()}`);

        // ── Step 7: 広告3本 × グループ2 ─────────────────────────
        console.log("Step 7/7: 広告グループ2に広告3本を作成中...");

        const ad2aResourceName = await client.createResponsiveSearchAd(
          adGroup2ResourceName,
          ["仕訳作業を90%削減", "2時間30分→15分に短縮", "税理士向けAI｜先行登録受付中"],
          [
            "月次決算の仕訳チェックをAIが自動処理。税理士の確認作業を最大80%削減します。",
            "freeeと連携するだけ。5分で使い始められる税理士向けAIパートナー。",
          ],
          "https://zeimu.ai/lp/?utm_source=google&utm_medium=paid_search&utm_campaign=wl-acquisition&utm_content=ad-a-efficiency"
        );
        console.log(`  ✅ 広告A (数字訴求): ${ad2aResourceName.split("/").pop()}`);

        const ad2bResourceName = await client.createResponsiveSearchAd(
          adGroup2ResourceName,
          ["スタッフ採用コストの1/10以下", "AIが月次決算チェックを代行", "税理士向けAI｜無料で先行登録"],
          [
            "200社の顧問先管理もAIがサポート。転記作業を1/5に削減した実績。",
            "ISMS認証取得済み。税理士事務所のデータを安全に処理します。",
          ],
          "https://zeimu.ai/lp/?utm_source=google&utm_medium=paid_search&utm_campaign=wl-acquisition&utm_content=ad-b-cost"
        );
        console.log(`  ✅ 広告B (コスト訴求): ${ad2bResourceName.split("/").pop()}`);

        const ad2cResourceName = await client.createResponsiveSearchAd(
          adGroup2ResourceName,
          ["税理士向けAI 先行登録受付中", "月次決算を自動化｜無料体験", "仕訳90%削減｜AIパートナー"],
          [
            "税理士の月次決算チェック・異常値検出をAIが自動化。顧問先200社分を管理。",
            "メールアドレスだけで登録可能。正式版は採用コストの1/10以下の価格予定。",
          ],
          "https://zeimu.ai/lp/?utm_source=google&utm_medium=paid_search&utm_campaign=wl-acquisition&utm_content=ad-c-earlyaccess"
        );
        console.log(`  ✅ 広告C (先行登録訴求): ${ad2cResourceName.split("/").pop()}`);

        // ── 結果サマリー ──────────────────────────────────────────
        console.log("\n✅ 全リソース作成完了（全て PAUSED 状態）\n");
        console.log("=".repeat(60));
        console.log("作成済みリソース一覧:");
        console.log(`  キャンペーン予算  ID: ${budgetId}`);
        console.log(`  キャンペーン      ID: ${campaignId}  名前: zeimu-search-wl-v1`);
        console.log(`  広告グループ1     ID: ${adGroup1Id}  名前: ag-efficiency`);
        console.log(`  広告グループ2     ID: ${adGroup2Id}  名前: ag-bookkeeping`);
        console.log(`  広告 (G1-A)      ID: ${ad1aResourceName.split("/").pop()}`);
        console.log(`  広告 (G1-B)      ID: ${ad1bResourceName.split("/").pop()}`);
        console.log(`  広告 (G1-C)      ID: ${ad1cResourceName.split("/").pop()}`);
        console.log(`  広告 (G2-A)      ID: ${ad2aResourceName.split("/").pop()}`);
        console.log(`  広告 (G2-B)      ID: ${ad2bResourceName.split("/").pop()}`);
        console.log(`  広告 (G2-C)      ID: ${ad2cResourceName.split("/").pop()}`);
        console.log("=".repeat(60));

      } catch (err) {
        console.error("❌ エラー:", err instanceof Error ? err.message : err);
        process.exit(1);
      }
    });
}
