import type { AcrossConfigs, AcrossProvider, OifProvider, OifProviderConfig } from "../internal.js";

export const PROTOCOLS = {
    ACROSS: "across",
    OIF: "oif",
} as const;

export type SupportedProtocols = (typeof PROTOCOLS)[keyof typeof PROTOCOLS];

export type SupportedProtocolProviders = {
    [PROTOCOLS.ACROSS]: AcrossProvider;
    [PROTOCOLS.OIF]: OifProvider;
};

export type SupportedProtocolsConfigs<Protocol extends SupportedProtocols> = {
    [PROTOCOLS.ACROSS]: AcrossConfigs;
    [PROTOCOLS.OIF]: OifProviderConfig;
}[Protocol];

export type SupportedProtocolsDependencies<Protocol extends SupportedProtocols> = {
    [PROTOCOLS.ACROSS]: object;
    [PROTOCOLS.OIF]: object;
}[Protocol];
