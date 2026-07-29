export type GoogleOAuthRevocationResult =
  | { status: "revoked" }
  | { status: "already-invalid" };

export function readGoogleAdsRefreshToken(
  env: Record<string, string | undefined>,
): string {
  const token = env.GOOGLE_ADS_REFRESH_TOKEN?.trim();
  if (!token) {
    throw new Error("GOOGLE_ADS_REFRESH_TOKEN is required");
  }
  return token;
}

export async function revokeGoogleOAuthToken(
  token: string,
  fetchImpl: typeof fetch = fetch,
): Promise<GoogleOAuthRevocationResult> {
  const response = await fetchImpl("https://oauth2.googleapis.com/revoke", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ token }).toString(),
  });

  if (response.ok) {
    return { status: "revoked" };
  }

  if (response.status === 400) {
    try {
      const body = (await response.json()) as { error?: unknown };
      if (body.error === "invalid_token") {
        return { status: "already-invalid" };
      }
    } catch {
      // Fall through to the generic, redacted error.
    }
  }

  throw new Error(
    `Google OAuth token revocation failed (HTTP ${response.status})`,
  );
}
