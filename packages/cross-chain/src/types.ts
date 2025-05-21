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

export type CrossChainProtocolConfig<Protocol extends SupportedProtocols> = {
    [PROTOCOLS.ACROSS]: {
        provider: AcrossProvider;
        config: AcrossConfigs;
        dependencies: AcrossDependencies;
    };
    [PROTOCOLS.SAMPLE]: {
        provider: SampleProvider;
        config: undefined;
        dependencies: undefined;
    };
}[Protocol];
