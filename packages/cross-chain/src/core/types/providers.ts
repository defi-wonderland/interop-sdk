import type { AcrossProvider } from "../../protocols/across/provider.js";
import type { OifProvider } from "../../protocols/oif/provider.js";
import type { AcrossConfigs } from "../interfaces/AcrossProvider.interface.js";
import type { OifProviderConfig } from "../interfaces/OifProvider.interface.js";

export const PROTOCOLS = {
    ACROSS: "across",
    OIF: "oif",
} as const;

export type SupportedProtocols = (typeof PROTOCOLS)[keyof typeof PROTOCOLS];

export type SupportedProtocolProviders = {
    [PROTOCOLS.ACROSS]: AcrossProvider;
    [PROTOCOLS.OIF]: OifProvider;
};

export type SupportedProtocolsConfigs<Protocol extends SupportedProtocols> = {
    [PROTOCOLS.ACROSS]: AcrossConfigs;
    [PROTOCOLS.OIF]: OifProviderConfig;
}[Protocol];
