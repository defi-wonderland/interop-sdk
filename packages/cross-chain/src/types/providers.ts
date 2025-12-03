import type { AcrossConfigs, AcrossProvider, SampleProvider } from "../internal.js";

export const PROTOCOLS = {
    ACROSS: "across",
    SAMPLE: "sample-protocol",
} as const;

export type SupportedProtocols = (typeof PROTOCOLS)[keyof typeof PROTOCOLS];

export type SupportedProtocolProviders = {
    [PROTOCOLS.ACROSS]: AcrossProvider;
    [PROTOCOLS.SAMPLE]: SampleProvider;
};

export type SupportedProtocolsConfigs<Protocol extends SupportedProtocols> = {
    [PROTOCOLS.ACROSS]: AcrossConfigs;
    [PROTOCOLS.SAMPLE]: object;
}[Protocol];

export type SupportedProtocolsDependencies<Protocol extends SupportedProtocols> = {
    [PROTOCOLS.ACROSS]: object;
    [PROTOCOLS.SAMPLE]: object;
}[Protocol];
