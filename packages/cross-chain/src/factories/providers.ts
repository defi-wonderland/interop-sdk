export const PROTOCOLS = {
    ACROSS: "across",
    OIF: "oif",
    LIFI_INTENTS: "lifi-intents",
    RELAY: "relay",
    BUNGEE: "bungee",
} as const;

export type SupportedProtocols = (typeof PROTOCOLS)[keyof typeof PROTOCOLS];
