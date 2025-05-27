import type {
    AcrossConfigs,
    AcrossDependencies,
    AcrossProvider,
    SampleProvider,
} from "./internal.js";

export const PROTOCOLS = {
    ACROSS: "across",
    SAMPLE: "sample-protocol",
} as const;

export type SupportedProtocols = (typeof PROTOCOLS)[keyof typeof PROTOCOLS];

export type SupportedProtocolProviders = {
    [PROTOCOLS.ACROSS]: AcrossProvider;
    [PROTOCOLS.SAMPLE]: SampleProvider;
};

export type SupportedProtocolsConfigs = {
    [PROTOCOLS.ACROSS]: AcrossConfigs;
    [PROTOCOLS.SAMPLE]: undefined;
};

export type SupportedProtocolsDependencies = {
    [PROTOCOLS.ACROSS]: AcrossDependencies;
    [PROTOCOLS.SAMPLE]: undefined;
};
