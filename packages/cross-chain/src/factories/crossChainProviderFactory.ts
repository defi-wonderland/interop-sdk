import type {
    AcrossConfigs,
    BungeeConfigs,
    LifiIntentsProviderConfig,
    OifProviderConfig,
    RelayConfigs,
} from "../internal.js";
import type { SupportedProtocols } from "./providers.js";
import {
    AcrossProvider,
    BungeeProvider,
    LifiIntentsProvider,
    OifProvider,
    RelayProvider,
    UnsupportedProtocol,
} from "../internal.js";
import { PROTOCOLS } from "./providers.js";

/** Maps each protocol to its provider factory. Source of truth for the types below. */
const PROTOCOL_FACTORIES = {
    [PROTOCOLS.ACROSS]: (config?: AcrossConfigs): AcrossProvider =>
        new AcrossProvider(config ?? {}),
    [PROTOCOLS.RELAY]: (config?: RelayConfigs): RelayProvider => new RelayProvider(config ?? {}),
    [PROTOCOLS.BUNGEE]: (config?: BungeeConfigs): BungeeProvider =>
        new BungeeProvider(config ?? {}),
    [PROTOCOLS.OIF]: (config: OifProviderConfig): OifProvider => new OifProvider(config),
    [PROTOCOLS.LIFI_INTENTS]: (config: LifiIntentsProviderConfig): LifiIntentsProvider =>
        new LifiIntentsProvider(config),
};

type ProtocolArgs = {
    [P in SupportedProtocols]: Parameters<(typeof PROTOCOL_FACTORIES)[P]>;
};
type ProtocolProviders = {
    [P in SupportedProtocols]: ReturnType<(typeof PROTOCOL_FACTORIES)[P]>;
};

/** Config type accepted by a protocol. */
export type SupportedProtocolsConfigs<P extends SupportedProtocols> = NonNullable<
    ProtocolArgs[P][0]
>;

/** Protocols whose config is optional. */
export type OptionalConfigProtocols = {
    [P in SupportedProtocols]: undefined extends ProtocolArgs[P][0] ? P : never;
}[SupportedProtocols];

const factories: { [P in SupportedProtocols]: (...args: ProtocolArgs[P]) => ProtocolProviders[P] } =
    PROTOCOL_FACTORIES;

/**
 * Creates a provider for the given protocol; config is required or optional per protocol.
 *
 * @throws {UnsupportedProtocol} If the protocol is not registered.
 */
export function createCrossChainProvider<P extends SupportedProtocols>(
    protocolName: P,
    ...args: ProtocolArgs[P]
): ProtocolProviders[P] {
    const factory = factories[protocolName];
    if (!factory) {
        throw new UnsupportedProtocol(protocolName);
    }
    return factory(...args);
}
