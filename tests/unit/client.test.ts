import { describe, it, expect } from "vitest";
import { buildConfig, maskToken } from "../../src/lib/config.js";

describe("buildConfig", () => {
  const required = {
    GOOGLE_ADS_CLIENT_ID: "client-id-123",
    GOOGLE_ADS_CLIENT_SECRET: "client-secret-123",
    GOOGLE_ADS_REFRESH_TOKEN: "refresh-token-123",
    GOOGLE_ADS_CUSTOMER_ID: "8615999793",
  };

  it("環境変数から設定を構築できる", () => {
    const config = buildConfig({ ...required, GOOGLE_ADS_LOGIN_CUSTOMER_ID: "2398179748" });
    expect(config.clientId).toBe("client-id-123");
    expect(config.clientSecret).toBe("client-secret-123");
    expect(config.refreshToken).toBe("refresh-token-123");
    expect(config.customerId).toBe("8615999793");
    expect(config.loginCustomerId).toBe("2398179748");
  });

  it("developer tokenとlogin customer idは無くてもよい", () => {
    const config = buildConfig(required);
    expect(config.loginCustomerId).toBeUndefined();
    expect(config).not.toHaveProperty("developerToken");
  });

  it("developer tokenが設定されていても設定に持たない", () => {
    const config = buildConfig({ ...required, GOOGLE_ADS_DEVELOPER_TOKEN: "old-token" });
    expect(JSON.stringify(config)).not.toContain("old-token");
  });

  it.each(Object.keys(required))("%sが欠けている場合はエラーを投げる", (key) => {
    const env: Record<string, string | undefined> = { ...required };
    delete env[key];
    expect(() => buildConfig(env)).toThrow(key);
  });
});

describe("maskToken", () => {
  it("トークンの先頭8文字を残してマスクする", () => {
    expect(maskToken("abcdefghijklmnop")).toBe("abcdefgh...");
  });

  it("8文字以下の場合は全てマスクする", () => {
    expect(maskToken("short")).toBe("***");
  });

  it("空文字の場合は空文字を返す", () => {
    expect(maskToken("")).toBe("");
  });
});
