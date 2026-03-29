import { describe, it, expect } from "vitest";
import { buildConfig, maskToken } from "../../src/lib/config.js";

describe("buildConfig", () => {
  it("環境変数から設定を構築できる", () => {
    const env = {
      GOOGLE_ADS_DEVELOPER_TOKEN: "dev-token-123",
      GOOGLE_ADS_CLIENT_ID: "client-id-123",
      GOOGLE_ADS_CLIENT_SECRET: "client-secret-123",
      GOOGLE_ADS_REFRESH_TOKEN: "refresh-token-123",
      GOOGLE_ADS_CUSTOMER_ID: "8615999793",
      GOOGLE_ADS_LOGIN_CUSTOMER_ID: "2398179748",
    };
    const config = buildConfig(env);
    expect(config.developerToken).toBe("dev-token-123");
    expect(config.clientId).toBe("client-id-123");
    expect(config.clientSecret).toBe("client-secret-123");
    expect(config.refreshToken).toBe("refresh-token-123");
    expect(config.customerId).toBe("8615999793");
    expect(config.loginCustomerId).toBe("2398179748");
  });

  it("必須環境変数が欠けている場合はエラーを投げる", () => {
    expect(() => buildConfig({})).toThrow("GOOGLE_ADS_DEVELOPER_TOKEN");
  });

  it("GOOGLE_ADS_CUSTOMER_IDが欠けている場合はエラーを投げる", () => {
    const env = {
      GOOGLE_ADS_DEVELOPER_TOKEN: "dev-token",
      GOOGLE_ADS_CLIENT_ID: "client-id",
      GOOGLE_ADS_CLIENT_SECRET: "client-secret",
      GOOGLE_ADS_REFRESH_TOKEN: "refresh-token",
    };
    expect(() => buildConfig(env)).toThrow("GOOGLE_ADS_CUSTOMER_ID");
  });

  it("GOOGLE_ADS_LOGIN_CUSTOMER_IDが欠けている場合はエラーを投げる", () => {
    const env = {
      GOOGLE_ADS_DEVELOPER_TOKEN: "dev-token",
      GOOGLE_ADS_CLIENT_ID: "client-id",
      GOOGLE_ADS_CLIENT_SECRET: "client-secret",
      GOOGLE_ADS_REFRESH_TOKEN: "refresh-token",
      GOOGLE_ADS_CUSTOMER_ID: "8615999793",
    };
    expect(() => buildConfig(env)).toThrow("GOOGLE_ADS_LOGIN_CUSTOMER_ID");
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
