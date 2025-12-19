import type {
    CrossChainProvider,
    SupportedProtocols,
    SupportedProtocolsConfigs,
    SupportedProtocolsDependencies,
} from "../internal.js";
import { AcrossProvider, OifProvider, PROTOCOLS, UnsupportedProtocol } from "../internal.js";

/**
 * A factory for creating CrossChainProviders based on the protocol name
 */
export class CrossChainProviderFactory {
    /**
     * Builds a CrossChainProvider
     * @param protocolName - The name of the protocol
     * @param config - The configuration for the provider
     * @param dependencies - The dependencies for the provider
     * @returns A CrossChainProvider
     * @throws {UnsupportedProtocol} If the protocol is not supported
     */
    public static build<Protocol extends SupportedProtocols>(
        protocolName: Protocol,
        config: SupportedProtocolsConfigs<Protocol>,
        _dependencies: SupportedProtocolsDependencies<Protocol>,
    ): CrossChainProvider {
        switch (protocolName) {
            case PROTOCOLS.ACROSS:
                return new AcrossProvider(
                    config as SupportedProtocolsConfigs<typeof PROTOCOLS.ACROSS>,
                );
            case PROTOCOLS.OIF:
                return new OifProvider(config as SupportedProtocolsConfigs<typeof PROTOCOLS.OIF>);
            default:
                throw new UnsupportedProtocol(protocolName);
        }
    }
}

/**
 * Creates a CrossChainProvider
 * @param protocolName - The name of the protocol
 * @param config - The configuration for the provider
 * @param dependencies - The dependencies for the provider
 * @returns A CrossChainProvider
 */
export const createCrossChainProvider = <Protocol extends SupportedProtocols>(
    protocolName: Protocol,
    config: SupportedProtocolsConfigs<Protocol>,
    dependencies: SupportedProtocolsDependencies<Protocol>,
): CrossChainProvider => {
    return CrossChainProviderFactory.build(protocolName, config, dependencies);
};
