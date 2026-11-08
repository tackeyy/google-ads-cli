import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Command } from "commander";
import { afterEach, describe, expect, it, vi } from "vitest";
import { registerKeywordsCommand } from "../../src/cli/commands/keywords.js";
import { GadsClient } from "../../src/lib/client.js";
import {
  buildHistoricalMetricsRequest,
  normalizeKeywordVolumeInput,
  parseHistoricalMetricsResponse,
} from "../../src/lib/keywords.js";

vi.mock("google-auth-library", () => ({
  OAuth2Client: class {
    setCredentials() {}
    async getAccessToken() {
      return { token: "access-token" };
    }
  },
}));

const input = (over: Record<string, unknown> = {}) => ({
  keywords: ["生成AI 法人"],
  geo: "2392",
  language: "1005",
  network: "GOOGLE_SEARCH",
  ...over,
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("normalizeKeywordVolumeInput", () => {
  it("前後の空白と空行を除き、重複を除いて順序を保つ", () => {
    const result = normalizeKeywordVolumeInput(input({ keywords: [" b ", "", "a", "b", "   "] }));
    expect(result.keywords).toEqual(["b", "a"]);
  });

  it("10,000語までは受け付け、10,001語は拒否する", () => {
    const many = (n: number) => Array.from({ length: n }, (_, i) => `語${i}`);
    expect(normalizeKeywordVolumeInput(input({ keywords: many(10000) })).keywords).toHaveLength(10000);
    expect(() => normalizeKeywordVolumeInput(input({ keywords: many(10001) }))).toThrow("10,000");
  });

  it.each([
    ["語が無い", { keywords: [] }, "キーワード"],
    ["空行だけ", { keywords: ["", "  "] }, "キーワード"],
    ["地域が数字でない", { geo: "JP" }, "地域"],
    ["地域が空", { geo: "" }, "地域"],
    ["言語が数字でない", { language: "ja" }, "言語"],
    ["ネットワークが不正", { network: "YOUTUBE" }, "ネットワーク"],
    ["開始だけ", { from: "2026-01" }, "期間"],
    ["終了だけ", { to: "2026-01" }, "期間"],
    ["月が13", { from: "2026-13", to: "2026-13" }, "期間"],
    ["月が00", { from: "2026-00", to: "2026-01" }, "期間"],
    ["日付まで指定", { from: "2026-01-01", to: "2026-02" }, "期間"],
    ["開始が終了より後", { from: "2026-03", to: "2026-02" }, "期間"],
  ])("%sは拒否する", (_name, over, message) => {
    expect(() => normalizeKeywordVolumeInput(input(over))).toThrow(message);
  });

  it.each(["GOOGLE_SEARCH", "GOOGLE_SEARCH_AND_PARTNERS"])("ネットワーク%sを受け付ける", (network) => {
    expect(normalizeKeywordVolumeInput(input({ network })).network).toBe(network);
  });
});

describe("buildHistoricalMetricsRequest", () => {
  it("地域・言語・ネットワークをリソース名で渡す", () => {
    const body = buildHistoricalMetricsRequest(normalizeKeywordVolumeInput(input()));
    expect(body).toEqual({
      keywords: ["生成AI 法人"],
      geoTargetConstants: ["geoTargetConstants/2392"],
      language: "languageConstants/1005",
      keywordPlanNetwork: "GOOGLE_SEARCH",
      includeAdultKeywords: false,
    });
  });

  it("期間を月の名前で渡す", () => {
    const body = buildHistoricalMetricsRequest(
      normalizeKeywordVolumeInput(input({ from: "2025-11", to: "2026-10" })),
    );
    expect(body.historicalMetricsOptions).toEqual({
      yearMonthRange: {
        start: { year: 2025, month: "NOVEMBER" },
        end: { year: 2026, month: "OCTOBER" },
      },
    });
  });
});

describe("parseHistoricalMetricsResponse", () => {
  const normalized = (keywords: string[]) => normalizeKeywordVolumeInput(input({ keywords }));
  const now = new Date("2026-11-08T12:00:00.000Z");

  it("文字列の数値を数値にし、月別を年月に変換する", () => {
    const parsed = parseHistoricalMetricsResponse(
      {
        results: [
          {
            text: "a",
            closeVariants: ["a b"],
            keywordMetrics: {
              avgMonthlySearches: "1300",
              competition: "LOW",
              competitionIndex: "12",
              lowTopOfPageBidMicros: "100000000",
              highTopOfPageBidMicros: "500000000",
              monthlySearchVolumes: [
                { year: "2026", month: "OCTOBER", monthlySearches: "1000" },
                { year: "2026", month: "JANUARY", monthlySearches: "2000" },
              ],
            },
          },
        ],
      },
      normalized(["a"]),
      now,
    );
    expect(parsed.results[0]).toEqual({
      text: "a",
      closeVariants: ["a b"],
      requestedKeywords: ["a"],
      avgMonthlySearches: 1300,
      competition: "LOW",
      competitionIndex: 12,
      lowTopOfPageBidMicros: 100000000,
      highTopOfPageBidMicros: 500000000,
      monthlySearchVolumes: [
        { month: "2026-01", searches: 2000 },
        { month: "2026-10", searches: 1000 },
      ],
    });
    expect(parsed.notReturned).toEqual([]);
  });

  it("値が無いものを0にせずnullにする", () => {
    const parsed = parseHistoricalMetricsResponse({ results: [{ text: "a" }] }, normalized(["a"]), now);
    expect(parsed.results[0]).toMatchObject({
      avgMonthlySearches: null,
      competition: null,
      competitionIndex: null,
      lowTopOfPageBidMicros: null,
      highTopOfPageBidMicros: null,
      monthlySearchVolumes: [],
      closeVariants: [],
    });
  });

  it("月別の値が無い月を0にしない", () => {
    const parsed = parseHistoricalMetricsResponse(
      {
        results: [
          {
            text: "a",
            keywordMetrics: { monthlySearchVolumes: [{ year: "2026", month: "MARCH" }] },
          },
        ],
      },
      normalized(["a"]),
      now,
    );
    expect(parsed.results[0].monthlySearchVolumes).toEqual([{ month: "2026-03", searches: null }]);
  });

  it("APIが明示した0は0のまま残す", () => {
    const parsed = parseHistoricalMetricsResponse(
      { results: [{ text: "a", keywordMetrics: { avgMonthlySearches: "0" } }] },
      normalized(["a"]),
      now,
    );
    expect(parsed.results[0].avgMonthlySearches).toBe(0);
  });

  it.each(["abc", "", " 12 ", "1e3", "-1", "1.5"])("数値でない値%jはnullにする", (value) => {
    const parsed = parseHistoricalMetricsResponse(
      { results: [{ text: "a", keywordMetrics: { avgMonthlySearches: value } }] },
      normalized(["a"]),
      now,
    );
    expect(parsed.results[0].avgMonthlySearches).toBeNull();
  });

  it("結果の無い語をnotReturnedに入れ、0件の行を作らない", () => {
    const parsed = parseHistoricalMetricsResponse({ results: [{ text: "a" }] }, normalized(["a", "b"]), now);
    expect(parsed.notReturned).toEqual(["b"]);
    expect(parsed.results.map((r) => r.text)).toEqual(["a"]);
  });

  it("resultsが無い応答はすべてnotReturnedにする", () => {
    const parsed = parseHistoricalMetricsResponse({}, normalized(["a", "b"]), now);
    expect(parsed.results).toEqual([]);
    expect(parsed.notReturned).toEqual(["a", "b"]);
  });

  it("近似語へ統合された語を統合先の行に結び付ける", () => {
    const parsed = parseHistoricalMetricsResponse(
      { results: [{ text: "car", closeVariants: ["cars"] }] },
      normalized(["car", "cars"]),
      now,
    );
    expect(parsed.results[0].requestedKeywords).toEqual(["car", "cars"]);
    expect(parsed.notReturned).toEqual([]);
  });

  it("大文字小文字と全角半角の違いは同じ語として結び付ける", () => {
    const parsed = parseHistoricalMetricsResponse(
      { results: [{ text: "chatgpt 法人" }] },
      normalized(["ＣｈａｔＧＰＴ　法人"]),
      now,
    );
    expect(parsed.results[0].requestedKeywords).toEqual(["ＣｈａｔＧＰＴ　法人"]);
    expect(parsed.notReturned).toEqual([]);
  });

  it("依頼していない語の結果も捨てずに残す", () => {
    const parsed = parseHistoricalMetricsResponse({ results: [{ text: "z" }] }, normalized(["a"]), now);
    expect(parsed.results[0]).toMatchObject({ text: "z", requestedKeywords: [] });
    expect(parsed.notReturned).toEqual(["a"]);
  });

  it("取得条件を結果に残す", () => {
    const parsed = parseHistoricalMetricsResponse(
      {},
      normalizeKeywordVolumeInput(input({ from: "2025-11", to: "2026-10", network: "GOOGLE_SEARCH_AND_PARTNERS" })),
      now,
    );
    expect(parsed.criteria).toEqual({
      geoTargetConstant: "geoTargetConstants/2392",
      language: "languageConstants/1005",
      network: "GOOGLE_SEARCH_AND_PARTNERS",
      from: "2025-11",
      to: "2026-10",
      fetchedAt: "2026-11-08T12:00:00.000Z",
    });
  });

  it("期間の指定が無ければ期間をnullで残す", () => {
    const parsed = parseHistoricalMetricsResponse({}, normalized(["a"]), now);
    expect(parsed.criteria).toMatchObject({ from: null, to: null });
  });
});

describe("GadsClient.generateKeywordHistoricalMetrics", () => {
  const config = { clientId: "c", clientSecret: "s", refreshToken: "r", customerId: "111", loginCustomerId: "222" };

  it("v26の公式パスへPOSTし、共通ヘッダーを使う", async () => {
    const mock = vi.fn(async (_url: string, _init: RequestInit) => new Response(JSON.stringify({ results: [] })));
    vi.stubGlobal("fetch", mock);
    const body = { keywords: ["a"] };
    const response = await new GadsClient(config).generateKeywordHistoricalMetrics(body);
    const [url, init] = mock.mock.calls[0];
    expect(url).toBe("https://googleads.googleapis.com/v26/customers/111:generateKeywordHistoricalMetrics");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual(body);
    const headers = init.headers as Record<string, string>;
    expect(headers["Authorization"]).toBe("Bearer access-token");
    expect(headers["login-customer-id"]).toBe("222");
    expect(headers).not.toHaveProperty("developer-token");
    expect(response).toEqual({ results: [] });
  });

  it("エラー応答は状態コードと本文を含めて例外にする", async () => {
    vi.stubGlobal("fetch", async () => new Response("RESOURCE_EXHAUSTED", { status: 429 }));
    await expect(new GadsClient(config).generateKeywordHistoricalMetrics({})).rejects.toThrow(/429.*RESOURCE_EXHAUSTED/);
  });
});

describe("keywords volumeコマンド", () => {
  const env = {
    GOOGLE_ADS_CLIENT_ID: "c",
    GOOGLE_ADS_CLIENT_SECRET: "s",
    GOOGLE_ADS_REFRESH_TOKEN: "r",
    GOOGLE_ADS_CUSTOMER_ID: "111",
  };

  async function run(args: string[], response: unknown = { results: [{ text: "a", keywordMetrics: { avgMonthlySearches: "1300" } }] }) {
    for (const [k, v] of Object.entries(env)) vi.stubEnv(k, v);
    const fetchMock = vi.fn(async (_url: string, _init: RequestInit) => new Response(JSON.stringify(response)));
    vi.stubGlobal("fetch", fetchMock);
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const exit = vi.spyOn(process, "exit").mockImplementation(((code?: number) => {
      throw new Error(`exit:${code}`);
    }) as never);
    const program = new Command();
    registerKeywordsCommand(program);
    let thrown: unknown;
    try {
      await program.parseAsync(["node", "google-ads-cli", "keywords", "volume", ...args]);
    } catch (err) {
      thrown = err;
    }
    vi.unstubAllEnvs();
    return { fetchMock, log, error, exit, thrown, output: log.mock.calls.map((c) => c.join(" ")).join("\n") };
  }

  it("既定は日本・日本語・Google検索で取得する", async () => {
    const { fetchMock } = await run(["--keyword", "a"]);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body.geoTargetConstants).toEqual(["geoTargetConstants/2392"]);
    expect(body.language).toBe("languageConstants/1005");
    expect(body.keywordPlanNetwork).toBe("GOOGLE_SEARCH");
  });

  it("--keywordを繰り返して複数の語を渡せる", async () => {
    const { fetchMock } = await run(["--keyword", "a", "--keyword", "b"]);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body as string).keywords).toEqual(["a", "b"]);
  });

  it("--jsonは条件と結果と未取得の語を出力する", async () => {
    const { output } = await run(["--keyword", "a", "--keyword", "b", "--json"]);
    const parsed = JSON.parse(output);
    expect(parsed.criteria.geoTargetConstant).toBe("geoTargetConstants/2392");
    expect(parsed.results[0].avgMonthlySearches).toBe(1300);
    expect(parsed.notReturned).toEqual(["b"]);
  });

  it("通常の出力は値が無い語を0と書かず未取得と書く", async () => {
    const { output } = await run(["--keyword", "a", "--keyword", "b"], { results: [{ text: "a" }] });
    expect(output).toContain("未取得");
    expect(output).toContain("b");
    expect(output).not.toMatch(/\b0\b/);
  });

  it("--fileの語を1行1語で読み、--keywordと合わせて渡す", async () => {
    const dir = mkdtempSync(join(tmpdir(), "gads-keywords-"));
    try {
      const file = join(dir, "keywords.txt");
      writeFileSync(file, "b\r\n\nc\n");
      const { fetchMock } = await run(["--keyword", "a", "--file", file]);
      expect(JSON.parse(fetchMock.mock.calls[0][1].body as string).keywords).toEqual(["a", "b", "c"]);
    } finally {
      rmSync(dir, { recursive: true });
    }
  });

  it("入力が不正ならAPIを呼ばず終了コード1にする", async () => {
    const { fetchMock, thrown } = await run(["--keyword", "a", "--geo", "JP"]);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(String(thrown)).toContain("exit:1");
  });

  it("語の指定が無ければAPIを呼ばず終了コード1にする", async () => {
    const { fetchMock, thrown } = await run([]);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(String(thrown)).toContain("exit:1");
  });

  it("読めないファイルはAPIを呼ばず終了コード1にする", async () => {
    const { fetchMock, thrown } = await run(["--file", "/nonexistent/keywords.txt"]);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(String(thrown)).toContain("exit:1");
  });
});
