import type {
    AcrossConfigs,
    BungeeConfigs,
    CrossChainProvider,
    LifiIntentsProviderConfig,
    OifProviderConfig,
    RelayConfigs,
    SupportedProtocols,
    SupportedProtocolsConfigs,
} from "../internal.js";
import {
    AcrossProvider,
    BungeeProvider,
    LifiIntentsProvider,
    OifProvider,
    PROTOCOLS,
    RelayProvider,
    UnsupportedProtocol,
} from "../internal.js";

type RequiredConfigProtocols = typeof PROTOCOLS.OIF | typeof PROTOCOLS.LIFI_INTENTS;
type OptionalConfigProtocols =
    | typeof PROTOCOLS.ACROSS
    | typeof PROTOCOLS.RELAY
    | typeof PROTOCOLS.BUNGEE;

/**
 * Creates a CrossChainProvider for a protocol whose configuration is required
 * (currently `oif` and `lifi-intents`).
 * @param protocolName - The protocol identifier
 * @param config - Required protocol configuration
 */
export function createCrossChainProvider<P extends RequiredConfigProtocols>(
    protocolName: P,
    config: SupportedProtocolsConfigs<P>,
): CrossChainProvider;
/**
 * Creates a CrossChainProvider for a protocol whose configuration is optional
 * (currently `across`, `relay`, `bungee`).
 * @param protocolName - The protocol identifier
 * @param config - Optional protocol configuration (defaults applied by the provider)
 */
export function createCrossChainProvider<P extends OptionalConfigProtocols>(
    protocolName: P,
    config?: SupportedProtocolsConfigs<P>,
): CrossChainProvider;
/**
 * Creates a CrossChainProvider for the specified protocol.
 * @param protocolName - The protocol identifier, constrained to {@link SupportedProtocols}
 * @param config - The configuration for the provider
 * @returns A CrossChainProvider
 * @throws {UnsupportedProtocol} If called with a protocol that is not handled
 *   (only reachable if callers bypass the type system via `as` / `@ts-expect-error`)
 */
export function createCrossChainProvider<P extends SupportedProtocols>(
    protocolName: P,
    config?: SupportedProtocolsConfigs<P>,
): CrossChainProvider {
    switch (protocolName) {
        case PROTOCOLS.ACROSS:
            return new AcrossProvider((config as AcrossConfigs | undefined) ?? {});
        case PROTOCOLS.OIF:
            return new OifProvider(config as OifProviderConfig);
        case PROTOCOLS.LIFI_INTENTS:
            return new LifiIntentsProvider(config as LifiIntentsProviderConfig);
        case PROTOCOLS.RELAY:
            return new RelayProvider((config as RelayConfigs | undefined) ?? {});
        case PROTOCOLS.BUNGEE:
            return new BungeeProvider((config as BungeeConfigs | undefined) ?? {});
        default: {
            const _exhaustive: never = protocolName;
            throw new UnsupportedProtocol(_exhaustive as string);
        }
    }
}
