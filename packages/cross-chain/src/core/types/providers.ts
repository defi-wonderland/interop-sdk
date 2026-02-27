import type {
    AcrossConfigs,
    AcrossProvider,
    OifProvider,
    OifProviderConfig,
    RelayConfigs,
    RelayProvider,
} from "../../internal.js";

export const PROTOCOLS = {
    ACROSS: "across",
    OIF: "oif",
    RELAY: "relay",
} as const;

export type SupportedProtocols = (typeof PROTOCOLS)[keyof typeof PROTOCOLS];

export type SupportedProtocolProviders = {
    [PROTOCOLS.ACROSS]: AcrossProvider;
    [PROTOCOLS.OIF]: OifProvider;
    [PROTOCOLS.RELAY]: RelayProvider;
};

export type SupportedProtocolsConfigs<Protocol extends SupportedProtocols> = {
    [PROTOCOLS.ACROSS]: AcrossConfigs;
    [PROTOCOLS.OIF]: OifProviderConfig;
    [PROTOCOLS.RELAY]: RelayConfigs;
}[Protocol];
