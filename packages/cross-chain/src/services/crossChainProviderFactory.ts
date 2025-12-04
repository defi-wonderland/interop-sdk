import type {
    CrossChainProvider,
    SupportedProtocols,
    SupportedProtocolsConfigs,
    SupportedProtocolsDependencies,
} from "../internal.js";
import { AcrossConfigSchema, AcrossProvider, PROTOCOLS, UnsupportedProtocol } from "../internal.js";

/**
 * A factory for creating CrossChainProviders based on the protocol name
 * TODO: Check if we can improve typing here https://github.com/defi-wonderland/interop-sdk/pull/23#discussion_r2107826666
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
                const configParsed = AcrossConfigSchema.parse(config);
                return new AcrossProvider(configParsed);
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
