const MONTHS = [
  "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE",
  "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER",
];

type Network = "GOOGLE_SEARCH" | "GOOGLE_SEARCH_AND_PARTNERS";

export interface KeywordVolumeInput {
  keywords: string[];
  geo: string;
  language: string;
  network: Network;
  from: string | null;
  to: string | null;
}

function matchKey(value: string): string {
  return value.normalize("NFKC").toLowerCase().trim().replace(/\s+/gu, " ");
}

export function normalizeKeywordVolumeInput(input: Record<string, unknown>): KeywordVolumeInput {
  if (!Array.isArray(input.keywords) || input.keywords.some((word) => typeof word !== "string")) {
    throw new Error("キーワードは文字列の一覧で指定してください");
  }
  const keywords = [...new Set((input.keywords as string[]).map((word) => word.trim()).filter(Boolean))];
  if (keywords.length === 0) throw new Error("キーワードを指定してください");
  if (keywords.length > 10000) throw new Error("キーワードは10,000語以内で指定してください");
  const geo = input.geo ?? "2392";
  const language = input.language ?? "1005";
  if (typeof geo !== "string" || !/^\d+$/.test(geo)) throw new Error("地域は数字のIDで指定してください");
  if (typeof language !== "string" || !/^\d+$/.test(language)) throw new Error("言語は数字のIDで指定してください");
  const network = input.network ?? "GOOGLE_SEARCH";
  if (network !== "GOOGLE_SEARCH" && network !== "GOOGLE_SEARCH_AND_PARTNERS") {
    throw new Error("ネットワークはGOOGLE_SEARCHまたはGOOGLE_SEARCH_AND_PARTNERSを指定してください");
  }
  const from = input.from ?? null;
  const to = input.to ?? null;
  const validMonth = (value: unknown): value is string =>
    typeof value === "string" && /^(?!0000)\d{4}-(0[1-9]|1[0-2])$/.test(value);
  if ((from !== null || to !== null) && (!validMonth(from) || !validMonth(to) || from > to)) {
    throw new Error("期間は開始・終了をYYYY-MM形式で指定し、開始を終了以前にしてください");
  }
  return { keywords, geo, language, network, from: from as string | null, to: to as string | null };
}

export function buildHistoricalMetricsRequest(input: KeywordVolumeInput) {
  const yearMonth = (value: string) => ({
    year: Number(value.slice(0, 4)),
    month: MONTHS[Number(value.slice(5)) - 1],
  });
  return {
    keywords: input.keywords,
    geoTargetConstants: [`geoTargetConstants/${input.geo}`],
    language: `languageConstants/${input.language}`,
    keywordPlanNetwork: input.network,
    includeAdultKeywords: false,
    ...(input.from && input.to ? {
      historicalMetricsOptions: { yearMonthRange: { start: yearMonth(input.from), end: yearMonth(input.to) } },
    } : {}),
  };
}

function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown> : {};
}

function integer(value: unknown): number | null {
  if (typeof value !== "number" && (typeof value !== "string" || !/^\d+$/.test(value))) return null;
  const number = Number(value);
  return Number.isSafeInteger(number) && number >= 0 ? number : null;
}

export function parseHistoricalMetricsResponse(response: unknown, input: KeywordVolumeInput, now: Date) {
  const requested = new Map<string, string[]>();
  for (const word of input.keywords) {
    const key = matchKey(word);
    requested.set(key, [...(requested.get(key) ?? []), word]);
  }
  const returned = new Set<string>();
  const rawResults = record(response).results;
  const rows = (Array.isArray(rawResults) ? rawResults : []).map((value: unknown) => {
    const row = record(value);
    const text = typeof row.text === "string" ? row.text : null;
    const closeVariants = Array.isArray(row.closeVariants)
      ? row.closeVariants.filter((word): word is string => typeof word === "string") : [];
    return { row, text, closeVariants, words: [...(text === null ? [] : [text]), ...closeVariants] };
  });
  const exactWords = new Set(rows.flatMap(({ words }) => words));
  const results = rows.map(({ row, text, closeVariants, words }) => {
    const matched = new Set<string>();
    for (const word of words) {
      const originals = requested.get(matchKey(word)) ?? [];
      for (const original of originals) {
        if (original === word || (originals.length === 1 && !exactWords.has(original))) {
          matched.add(original);
          returned.add(original);
        }
      }
    }
    const metrics = record(row.keywordMetrics);
    const volumes = metrics.monthlySearchVolumes;
    const monthlySearchVolumes = (Array.isArray(volumes) ? volumes : []).flatMap((value: unknown) => {
      const volume = record(value);
      const year = integer(volume.year);
      const month = typeof volume.month === "string" ? MONTHS.indexOf(volume.month) + 1 : 0;
      if (year === null || year < 1 || year > 9999 || month === 0) return [];
      return [{
        month: `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}`,
        searches: integer(volume.monthlySearches),
      }];
    }).sort((a, b) => a.month.localeCompare(b.month));
    return {
      text,
      closeVariants,
      requestedKeywords: [...matched].sort((a, b) => input.keywords.indexOf(a) - input.keywords.indexOf(b)),
      avgMonthlySearches: integer(metrics.avgMonthlySearches),
      competition: typeof metrics.competition === "string" ? metrics.competition : null,
      competitionIndex: integer(metrics.competitionIndex),
      lowTopOfPageBidMicros: integer(metrics.lowTopOfPageBidMicros),
      highTopOfPageBidMicros: integer(metrics.highTopOfPageBidMicros),
      monthlySearchVolumes,
    };
  });
  return {
    criteria: {
      geoTargetConstant: `geoTargetConstants/${input.geo}`,
      language: `languageConstants/${input.language}`,
      network: input.network,
      from: input.from,
      to: input.to,
      fetchedAt: now.toISOString(),
    },
    results,
    notReturned: input.keywords.filter((word) => !returned.has(word)),
  };
}
