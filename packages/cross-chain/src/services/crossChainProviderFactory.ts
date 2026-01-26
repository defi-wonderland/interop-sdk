import type { AcrossConfigs, CrossChainProvider, OifProviderConfig } from "../internal.js";
import { AcrossProvider, OifProvider, PROTOCOLS, UnsupportedProtocol } from "../internal.js";

/**
 * Creates a CrossChainProvider for Across protocol
 * @param protocolName - "across"
 * @param config - Optional configuration (defaults to mainnet)
 */
export function createCrossChainProvider(
    protocolName: typeof PROTOCOLS.ACROSS,
    config?: AcrossConfigs,
): CrossChainProvider;
/**
 * Creates a CrossChainProvider for OIF protocol
 * @param protocolName - "oif"
 * @param config - Required configuration with solverId and url
 */
export function createCrossChainProvider(
    protocolName: typeof PROTOCOLS.OIF,
    config: OifProviderConfig,
): CrossChainProvider;
/**
 * Creates a CrossChainProvider for the specified protocol
 * @param protocolName - The name of the protocol
 * @param config - The configuration for the provider
 * @returns A CrossChainProvider
 * @throws {UnsupportedProtocol} If the protocol is not supported
 */
export function createCrossChainProvider(
    protocolName: string,
    config?: unknown,
): CrossChainProvider {
    if (protocolName === PROTOCOLS.ACROSS)
        return new AcrossProvider((config as AcrossConfigs) ?? {});
    if (protocolName === PROTOCOLS.OIF) return new OifProvider(config as OifProviderConfig);
    throw new UnsupportedProtocol(protocolName);
}
