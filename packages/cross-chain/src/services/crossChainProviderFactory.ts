import type {
    BasicOpenParams,
    CrossChainProvider,
    SupportedProtocols,
    SupportedProtocolsConfigs,
    SupportedProtocolsDependencies,
} from "../internal.js";
import { AcrossProvider, PROTOCOLS, SampleProvider, UnsupportedProtocol } from "../internal.js";

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
        _config: SupportedProtocolsConfigs[Protocol] = undefined,
        _dependencies: SupportedProtocolsDependencies[Protocol] = undefined,
    ): CrossChainProvider<BasicOpenParams> {
        switch (protocolName) {
            case PROTOCOLS.ACROSS:
                return new AcrossProvider() as CrossChainProvider<BasicOpenParams>;
            case PROTOCOLS.SAMPLE:
                return new SampleProvider();
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
    config: SupportedProtocolsConfigs[Protocol] = undefined,
    dependencies: SupportedProtocolsDependencies[Protocol] = undefined,
): CrossChainProvider<BasicOpenParams> => {
    return CrossChainProviderFactory.build(protocolName, config, dependencies);
};
