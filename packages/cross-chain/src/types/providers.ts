import type { AcrossConfigs, AcrossProvider } from "../internal.js";

export const PROTOCOLS = {
    ACROSS: "across",
} as const;

export type SupportedProtocols = (typeof PROTOCOLS)[keyof typeof PROTOCOLS];

export type SupportedProtocolProviders = {
    [PROTOCOLS.ACROSS]: AcrossProvider;
};

export type SupportedProtocolsConfigs<Protocol extends SupportedProtocols> = {
    [PROTOCOLS.ACROSS]: AcrossConfigs;
}[Protocol];

export type SupportedProtocolsDependencies<Protocol extends SupportedProtocols> = {
    [PROTOCOLS.ACROSS]: object;
}[Protocol];
