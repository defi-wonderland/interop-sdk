import type {
    AcrossConfigs,
    AcrossProvider,
    LifiIntentsProvider,
    LifiIntentsProviderConfig,
    OifProvider,
    OifProviderConfig,
} from "../internal.js";

export const PROTOCOLS = {
    ACROSS: "across",
    OIF: "oif",
    LIFI_INTENTS: "lifi-intents",
} as const;

export type SupportedProtocols = (typeof PROTOCOLS)[keyof typeof PROTOCOLS];

export type SupportedProtocolProviders = {
    [PROTOCOLS.ACROSS]: AcrossProvider;
    [PROTOCOLS.OIF]: OifProvider;
    [PROTOCOLS.LIFI_INTENTS]: LifiIntentsProvider;
};

export type SupportedProtocolsConfigs<Protocol extends SupportedProtocols> = {
    [PROTOCOLS.ACROSS]: AcrossConfigs;
    [PROTOCOLS.OIF]: OifProviderConfig;
    [PROTOCOLS.LIFI_INTENTS]: LifiIntentsProviderConfig;
}[Protocol];
