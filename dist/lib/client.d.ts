import type { GadsConfig } from "./config.js";
export declare class GadsClient {
    private oauth2;
    private config;
    constructor(config: GadsConfig);
    private getAccessToken;
    private gaqlSearch;
    authTest(): Promise<{
        customerId: string;
        descriptiveName: string;
        currencyCode: string;
        timeZone: string;
    }>;
    listCampaigns(): Promise<Array<{
        id: string;
        name: string;
        status: string;
        budget: string;
    }>>;
    private mutate;
    enableAdGroup(adGroupId: string): Promise<string>;
    enableCampaign(campaignId: string): Promise<string>;
    createCampaignBudget(name: string, dailyBudgetMicros: number): Promise<string>;
    createCampaign(name: string, budgetResourceName: string): Promise<string>;
    addCampaignLocation(campaignResourceName: string, geoTargetConstantId: number): Promise<string>;
    addCampaignLanguage(campaignResourceName: string, languageId: number): Promise<string>;
    createAdGroup(name: string, campaignResourceName: string): Promise<string>;
    addKeywords(adGroupResourceName: string, keywords: Array<{
        text: string;
        matchType: "PHRASE" | "EXACT" | "BROAD";
    }>): Promise<string[]>;
    addNegativeKeywords(campaignResourceName: string, texts: string[]): Promise<string[]>;
    createResponsiveSearchAd(adGroupResourceName: string, headlines: string[], descriptions: string[], finalUrl: string): Promise<string>;
    getInsights(fromDate: string, toDate: string): Promise<Array<{
        campaignName: string;
        impressions: number;
        clicks: number;
        cost: string;
        ctr: string;
    }>>;
}
//# sourceMappingURL=client.d.ts.map