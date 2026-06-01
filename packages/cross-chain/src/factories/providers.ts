import type {
    AcrossConfigs,
    BungeeConfigs,
    LifiIntentsProviderConfig,
    OifProviderConfig,
    RelayConfigs,
} from "../internal.js";

export const PROTOCOLS = {
    ACROSS: "across",
    OIF: "oif",
    LIFI_INTENTS: "lifi-intents",
    RELAY: "relay",
    BUNGEE: "bungee",
} as const;

export type SupportedProtocols = (typeof PROTOCOLS)[keyof typeof PROTOCOLS];

/** Config type accepted by each protocol. */
export type SupportedProtocolsConfigs<P extends SupportedProtocols> = {
    [PROTOCOLS.ACROSS]: AcrossConfigs;
    [PROTOCOLS.RELAY]: RelayConfigs;
    [PROTOCOLS.BUNGEE]: BungeeConfigs;
    [PROTOCOLS.OIF]: OifProviderConfig;
    [PROTOCOLS.LIFI_INTENTS]: LifiIntentsProviderConfig;
}[P];

/** Protocols whose config is optional. */
export type OptionalConfigProtocols =
    | typeof PROTOCOLS.ACROSS
    | typeof PROTOCOLS.RELAY
    | typeof PROTOCOLS.BUNGEE
    | typeof PROTOCOLS.LIFI_INTENTS;
