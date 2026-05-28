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
    across: AcrossConfigs;
    relay: RelayConfigs;
    bungee: BungeeConfigs;
    oif: OifProviderConfig;
    "lifi-intents": LifiIntentsProviderConfig;
}[P];

/** Protocols whose config is optional. */
export type OptionalConfigProtocols = "across" | "relay" | "bungee";
