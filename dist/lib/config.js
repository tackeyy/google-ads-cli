export function buildConfig(env) {
    const required = [
        "GOOGLE_ADS_DEVELOPER_TOKEN",
        "GOOGLE_ADS_CLIENT_ID",
        "GOOGLE_ADS_CLIENT_SECRET",
        "GOOGLE_ADS_REFRESH_TOKEN",
        "GOOGLE_ADS_CUSTOMER_ID",
        "GOOGLE_ADS_LOGIN_CUSTOMER_ID",
    ];
    for (const key of required) {
        if (!env[key])
            throw new Error(`環境変数 ${key} が設定されていません`);
    }
    return {
        developerToken: env.GOOGLE_ADS_DEVELOPER_TOKEN,
        clientId: env.GOOGLE_ADS_CLIENT_ID,
        clientSecret: env.GOOGLE_ADS_CLIENT_SECRET,
        refreshToken: env.GOOGLE_ADS_REFRESH_TOKEN,
        customerId: env.GOOGLE_ADS_CUSTOMER_ID,
        loginCustomerId: env.GOOGLE_ADS_LOGIN_CUSTOMER_ID,
    };
}
export function maskToken(token) {
    if (!token)
        return "";
    if (token.length <= 8)
        return "***";
    return token.slice(0, 8) + "...";
}
//# sourceMappingURL=config.js.map