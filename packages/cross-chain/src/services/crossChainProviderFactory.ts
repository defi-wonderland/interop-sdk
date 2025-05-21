import type {
    AcrossConfigs,
    AcrossDependencies,
    BasicOpenParams,
    CrossChainProtocolConfig,
    CrossChainProvider,
    SupportedProtocols,
} from "../internal.js";
import { AcrossProvider, SampleProvider, UnsupportedProtocol } from "../internal.js";

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
        config: CrossChainProtocolConfig<Protocol>["config"],
        dependencies: CrossChainProtocolConfig<Protocol>["dependencies"],
    ): CrossChainProvider<BasicOpenParams> {
        switch (protocolName) {
            case "across":
                return new AcrossProvider(
                    config as AcrossConfigs,
                    dependencies as AcrossDependencies,
                ) as CrossChainProvider<BasicOpenParams>;
            case "sample-protocol":
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
    config: CrossChainProtocolConfig<Protocol>["config"],
    dependencies: CrossChainProtocolConfig<Protocol>["dependencies"],
): CrossChainProvider<BasicOpenParams> => {
    return CrossChainProviderFactory.build(protocolName, config, dependencies);
};
