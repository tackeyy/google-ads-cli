export interface GadsConfig {
    developerToken: string;
    clientId: string;
    clientSecret: string;
    refreshToken: string;
    customerId: string;
    loginCustomerId: string;
}
export declare function buildConfig(env: Record<string, string | undefined>): GadsConfig;
export declare function maskToken(token: string): string;
//# sourceMappingURL=config.d.ts.map