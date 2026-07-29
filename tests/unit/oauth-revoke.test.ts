import { describe, expect, it, vi } from "vitest";
import {
  readGoogleAdsRefreshToken,
  revokeGoogleOAuthToken,
} from "../../src/lib/oauth-revoke.js";

describe("readGoogleAdsRefreshToken", () => {
  it("refresh token以外のGoogle Ads環境変数を要求しない", () => {
    expect(
      readGoogleAdsRefreshToken({
        GOOGLE_ADS_REFRESH_TOKEN: "refresh-only",
      }),
    ).toBe("refresh-only");
  });

  it("refresh tokenがない場合だけfail closedにする", () => {
    expect(() => readGoogleAdsRefreshToken({})).toThrow(
      "GOOGLE_ADS_REFRESH_TOKEN",
    );
  });
});

describe("revokeGoogleOAuthToken", () => {
  it("refresh tokenをform bodyで公式revoke endpointへ送る", async () => {
    const fetchImpl = vi.fn(async () => new Response(null, { status: 200 }));

    await expect(
      revokeGoogleOAuthToken("refresh/token+value", fetchImpl),
    ).resolves.toEqual({ status: "revoked" });

    expect(fetchImpl).toHaveBeenCalledWith(
      "https://oauth2.googleapis.com/revoke",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: "token=refresh%2Ftoken%2Bvalue",
      },
    );
  });

  it("invalid_tokenは既に利用不能として扱う", async () => {
    const fetchImpl = vi.fn(
      async () =>
        new Response(JSON.stringify({ error: "invalid_token" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }),
    );

    await expect(
      revokeGoogleOAuthToken("already-invalid", fetchImpl),
    ).resolves.toEqual({ status: "already-invalid" });
  });

  it("想定外レスポンスでもtokenをエラーへ含めない", async () => {
    const fetchImpl = vi.fn(
      async () => new Response("upstream detail", { status: 503 }),
    );

    await expect(
      revokeGoogleOAuthToken("must-not-appear", fetchImpl),
    ).rejects.toThrow("Google OAuth token revocation failed (HTTP 503)");
    await expect(
      revokeGoogleOAuthToken("must-not-appear", fetchImpl),
    ).rejects.not.toThrow("must-not-appear");
  });
});
