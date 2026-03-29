import { OAuth2Client } from "google-auth-library";
const API_VERSION = "v20";
const BASE_URL = `https://googleads.googleapis.com/${API_VERSION}`;
export class GadsClient {
    oauth2;
    config;
    constructor(config) {
        this.config = config;
        this.oauth2 = new OAuth2Client(config.clientId, config.clientSecret);
        this.oauth2.setCredentials({ refresh_token: config.refreshToken });
    }
    async getAccessToken() {
        const { token } = await this.oauth2.getAccessToken();
        if (!token)
            throw new Error("アクセストークンの取得に失敗しました");
        return token;
    }
    async gaqlSearch(gaql) {
        const token = await this.getAccessToken();
        const url = `${BASE_URL}/customers/${this.config.customerId}/googleAds:searchStream`;
        const res = await fetch(url, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
                "developer-token": this.config.developerToken,
                "login-customer-id": this.config.loginCustomerId,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ query: gaql }),
        });
        if (!res.ok) {
            const body = await res.text();
            throw new Error(`API エラー ${res.status}: ${body}`);
        }
        // searchStream returns NDJSON (one JSON object per line)
        const text = await res.text();
        const results = [];
        for (const line of text.split("\n")) {
            if (!line.trim() || line.trim() === "[" || line.trim() === "]")
                continue;
            const clean = line.replace(/^,/, "").trim();
            if (!clean)
                continue;
            try {
                const obj = JSON.parse(clean);
                if (obj.results)
                    results.push(...obj.results);
            }
            catch { /* skip */ }
        }
        return results;
    }
    async authTest() {
        const rows = await this.gaqlSearch(`
      SELECT
        customer.id,
        customer.descriptive_name,
        customer.currency_code,
        customer.time_zone
      FROM customer
      LIMIT 1
    `);
        const c = rows[0]?.customer ?? {};
        return {
            customerId: String(c["id"] ?? ""),
            descriptiveName: String(c["descriptiveName"] ?? ""),
            currencyCode: String(c["currencyCode"] ?? ""),
            timeZone: String(c["timeZone"] ?? ""),
        };
    }
    async listCampaigns() {
        const rows = await this.gaqlSearch(`
      SELECT
        campaign.id,
        campaign.name,
        campaign.status,
        campaign_budget.amount_micros
      FROM campaign
      ORDER BY campaign.id
    `);
        return rows.map((row) => {
            const r = row;
            const micros = Number(r.campaignBudget?.["amountMicros"] ?? 0);
            return {
                id: String(r.campaign?.["id"] ?? ""),
                name: String(r.campaign?.["name"] ?? ""),
                status: String(r.campaign?.["status"] ?? ""),
                budget: micros > 0 ? `¥${Math.round(micros / 1_000_000).toLocaleString()}` : "-",
            };
        });
    }
    async mutate(resource, operations) {
        const token = await this.getAccessToken();
        const url = `${BASE_URL}/customers/${this.config.customerId}/${resource}:mutate`;
        const res = await fetch(url, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
                "developer-token": this.config.developerToken,
                "login-customer-id": this.config.loginCustomerId,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ operations }),
        });
        if (!res.ok) {
            const body = await res.text();
            throw new Error(`API エラー ${res.status}: ${body}`);
        }
        return res.json();
    }
    async createCampaignBudget(name, dailyBudgetMicros) {
        const resp = await this.mutate("campaignBudgets", [{
                create: {
                    name,
                    amountMicros: String(dailyBudgetMicros),
                    deliveryMethod: "STANDARD",
                    explicitlyShared: false,
                },
            }]);
        return resp.results[0].resourceName;
    }
    async createCampaign(name, budgetResourceName) {
        const resp = await this.mutate("campaigns", [{
                create: {
                    name,
                    status: "PAUSED",
                    advertisingChannelType: "SEARCH",
                    maximizeClicks: {},
                    networkSettings: {
                        targetGoogleSearch: true,
                        targetSearchNetwork: true,
                        targetContentNetwork: false,
                        targetPartnerSearchNetwork: false,
                    },
                    campaignBudget: budgetResourceName,
                },
            }]);
        return resp.results[0].resourceName;
    }
    async addCampaignLocation(campaignResourceName, geoTargetConstantId) {
        const resp = await this.mutate("campaignCriteria", [{
                create: {
                    campaign: campaignResourceName,
                    location: {
                        geoTargetConstant: `geoTargetConstants/${geoTargetConstantId}`,
                    },
                },
            }]);
        return resp.results[0].resourceName;
    }
    async addCampaignLanguage(campaignResourceName, languageId) {
        const resp = await this.mutate("campaignCriteria", [{
                create: {
                    campaign: campaignResourceName,
                    language: {
                        languageConstant: `languageConstants/${languageId}`,
                    },
                },
            }]);
        return resp.results[0].resourceName;
    }
    async createAdGroup(name, campaignResourceName) {
        const resp = await this.mutate("adGroups", [{
                create: {
                    name,
                    campaign: campaignResourceName,
                    status: "PAUSED",
                },
            }]);
        return resp.results[0].resourceName;
    }
    async addKeywords(adGroupResourceName, keywords) {
        const operations = keywords.map((kw) => ({
            create: {
                adGroup: adGroupResourceName,
                status: "ENABLED",
                keyword: {
                    text: kw.text,
                    matchType: kw.matchType,
                },
            },
        }));
        const resp = await this.mutate("adGroupCriteria", operations);
        return resp.results.map((r) => r.resourceName);
    }
    async addNegativeKeywords(campaignResourceName, texts) {
        const operations = texts.map((text) => ({
            create: {
                campaign: campaignResourceName,
                negative: true,
                keyword: {
                    text,
                    matchType: "BROAD",
                },
            },
        }));
        const resp = await this.mutate("campaignCriteria", operations);
        return resp.results.map((r) => r.resourceName);
    }
    async createResponsiveSearchAd(adGroupResourceName, headlines, descriptions, finalUrl) {
        const resp = await this.mutate("adGroupAds", [{
                create: {
                    adGroup: adGroupResourceName,
                    status: "PAUSED",
                    ad: {
                        responsiveSearchAd: {
                            headlines: headlines.map((text) => ({ text })),
                            descriptions: descriptions.map((text) => ({ text })),
                        },
                        finalUrls: [finalUrl],
                    },
                },
            }]);
        return resp.results[0].resourceName;
    }
    async getInsights(fromDate, toDate) {
        const rows = await this.gaqlSearch(`
      SELECT
        campaign.name,
        metrics.impressions,
        metrics.clicks,
        metrics.cost_micros,
        metrics.ctr
      FROM campaign
      WHERE segments.date BETWEEN '${fromDate}' AND '${toDate}'
      ORDER BY metrics.cost_micros DESC
    `);
        return rows.map((row) => {
            const r = row;
            const micros = Number(r.metrics?.["costMicros"] ?? 0);
            const ctrVal = Number(r.metrics?.["ctr"] ?? 0);
            return {
                campaignName: String(r.campaign?.["name"] ?? ""),
                impressions: Number(r.metrics?.["impressions"] ?? 0),
                clicks: Number(r.metrics?.["clicks"] ?? 0),
                cost: `¥${Math.round(micros / 1_000_000).toLocaleString()}`,
                ctr: `${(ctrVal * 100).toFixed(2)}%`,
            };
        });
    }
}
//# sourceMappingURL=client.js.map