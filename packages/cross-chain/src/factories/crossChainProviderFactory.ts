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
    SuperbridgeProvider,
    UnsupportedProtocol,
} from "../internal.js";
import { PROTOCOLS } from "./providers.js";

/** Constructor args per protocol; `[P]` keeps it non-distributive so a union name still requires config. */
type ProtocolArgs<P extends SupportedProtocols> = [P] extends [OptionalConfigProtocols]
    ? [config?: SupportedProtocolsConfigs<P>]
    : [config: SupportedProtocolsConfigs<P>];

/** Maps each protocol to its provider factory. */
const PROTOCOL_FACTORIES: {
    [P in SupportedProtocols]: (...args: ProtocolArgs<P>) => CrossChainProvider;
} = {
    [PROTOCOLS.ACROSS]: (config) => new AcrossProvider(config ?? {}),
    [PROTOCOLS.RELAY]: (config) => new RelayProvider(config ?? {}),
    [PROTOCOLS.BUNGEE]: (config) => new BungeeProvider(config ?? {}),
    [PROTOCOLS.OIF]: (config) => new OifProvider(config),
    [PROTOCOLS.LIFI_INTENTS]: (config) => new LifiIntentsProvider(config ?? {}),
    [PROTOCOLS.SUPERBRIDGE]: (config) => new SuperbridgeProvider(config),
};

/**
 * Creates a provider for the given protocol; config is required for `oif`
 * and `superbridge`, and optional for `across`/`relay`/`bungee`/`lifi-intents`.
 *
 * @throws {UnsupportedProtocol} If the protocol is not registered.
 */
export function createCrossChainProvider<P extends SupportedProtocols>(
    protocolName: P,
    ...args: ProtocolArgs<P>
): CrossChainProvider {
    if (!Object.prototype.hasOwnProperty.call(PROTOCOL_FACTORIES, protocolName)) {
        throw new UnsupportedProtocol(protocolName);
    }
    const factory = PROTOCOL_FACTORIES[protocolName];
    return factory(...args);
}
