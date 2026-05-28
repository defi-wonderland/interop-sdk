import type { CrossChainProvider } from "../internal.js";
import type {
    OptionalConfigProtocols,
    SupportedProtocols,
    SupportedProtocolsConfigs,
} from "./providers.js";
import {
    AcrossProvider,
    BungeeProvider,
    LifiIntentsProvider,
    OifProvider,
    RelayProvider,
    UnsupportedProtocol,
} from "../internal.js";

/** Constructor args for a protocol: config is optional for optional-config protocols. */
type ProtocolArgs<P extends SupportedProtocols> = P extends OptionalConfigProtocols
    ? [config?: SupportedProtocolsConfigs<P>]
    : [config: SupportedProtocolsConfigs<P>];

/** Maps each protocol to its provider factory. */
const PROTOCOL_FACTORIES: {
    [P in SupportedProtocols]: (...args: ProtocolArgs<P>) => CrossChainProvider;
} = {
    across: (config) => new AcrossProvider(config ?? {}),
    relay: (config) => new RelayProvider(config ?? {}),
    bungee: (config) => new BungeeProvider(config ?? {}),
    oif: (config) => new OifProvider(config),
    "lifi-intents": (config) => new LifiIntentsProvider(config),
};

/**
 * Creates a provider for the given protocol; config is required for `oif`/`lifi-intents`
 * and optional for `across`/`relay`/`bungee`.
 *
 * @throws {UnsupportedProtocol} If the protocol is not registered.
 */
export function createCrossChainProvider<P extends SupportedProtocols>(
    protocolName: P,
    ...args: ProtocolArgs<P>
): CrossChainProvider {
    const factory = PROTOCOL_FACTORIES[protocolName];
    if (!factory) {
        throw new UnsupportedProtocol(protocolName);
    }
    return factory(...args);
}
