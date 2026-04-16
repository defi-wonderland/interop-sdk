import type {
    AcrossConfigs,
    AcrossProvider,
    BungeeConfigs,
    BungeeProvider,
    LifiIntentsProvider,
    LifiIntentsProviderConfig,
    OifProvider,
    OifProviderConfig,
    RelayConfigs,
    RelayProvider,
} from "../internal.js";

export const PROTOCOLS = {
    ACROSS: "across",
    OIF: "oif",
    LIFI_INTENTS: "lifi-intents",
    RELAY: "relay",
    BUNGEE: "bungee",
} as const;

export type SupportedProtocols = (typeof PROTOCOLS)[keyof typeof PROTOCOLS];

export type SupportedProtocolProviders = {
    [PROTOCOLS.ACROSS]: AcrossProvider;
    [PROTOCOLS.OIF]: OifProvider;
    [PROTOCOLS.LIFI_INTENTS]: LifiIntentsProvider;
    [PROTOCOLS.RELAY]: RelayProvider;
    [PROTOCOLS.BUNGEE]: BungeeProvider;
};

export type SupportedProtocolsConfigs<Protocol extends SupportedProtocols> = {
    [PROTOCOLS.ACROSS]: AcrossConfigs;
    [PROTOCOLS.OIF]: OifProviderConfig;
    [PROTOCOLS.LIFI_INTENTS]: LifiIntentsProviderConfig;
    [PROTOCOLS.RELAY]: RelayConfigs;
    [PROTOCOLS.BUNGEE]: BungeeConfigs;
}[Protocol];
