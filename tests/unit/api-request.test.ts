import { afterEach, describe, expect, it, vi } from "vitest";
import { GadsClient } from "../../src/lib/client.js";

vi.mock("google-auth-library", () => ({
  OAuth2Client: class {
    setCredentials() {}
    async getAccessToken() {
      return { token: "access-token" };
    }
  },
}));

const base = { clientId: "c", clientSecret: "s", refreshToken: "r", customerId: "111" };

function stubFetch(body: string) {
  const mock = vi.fn(async (_url: string, _init: RequestInit) => new Response(body, { status: 200 }));
  vi.stubGlobal("fetch", mock);
  return mock;
}

afterEach(() => vi.unstubAllGlobals());

describe("APIリクエスト", () => {
  it("検索はv26へ送り、developer-tokenを送らない", async () => {
    const mock = stubFetch("[]");
    await new GadsClient(base).listCampaigns();
    const [url, init] = mock.mock.calls[0];
    expect(url).toBe("https://googleads.googleapis.com/v26/customers/111/googleAds:searchStream");
    const headers = init.headers as Record<string, string>;
    expect(headers).not.toHaveProperty("developer-token");
    expect(headers["Authorization"]).toBe("Bearer access-token");
  });

  it("更新はv26へ送り、developer-tokenを送らない", async () => {
    const mock = stubFetch(JSON.stringify({ results: [{ resourceName: "x" }] }));
    await new GadsClient(base).pauseCampaign("9");
    const [url, init] = mock.mock.calls[0];
    expect(url).toBe("https://googleads.googleapis.com/v26/customers/111/campaigns:mutate");
    expect(init.headers as Record<string, string>).not.toHaveProperty("developer-token");
  });

  it("login customer idは未設定なら送らない", async () => {
    const mock = stubFetch("[]");
    await new GadsClient(base).listCampaigns();
    expect(mock.mock.calls[0][1].headers as Record<string, string>).not.toHaveProperty("login-customer-id");
  });

  it("login customer idは設定時だけ検索と更新の両方で送る", async () => {
    const config = { ...base, loginCustomerId: "222" };
    const search = stubFetch("[]");
    await new GadsClient(config).listCampaigns();
    expect((search.mock.calls[0][1].headers as Record<string, string>)["login-customer-id"]).toBe("222");
    const mutate = stubFetch(JSON.stringify({ results: [{ resourceName: "x" }] }));
    await new GadsClient(config).pauseCampaign("9");
    expect((mutate.mock.calls[0][1].headers as Record<string, string>)["login-customer-id"]).toBe("222");
  });
});
