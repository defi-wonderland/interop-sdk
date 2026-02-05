import { Address, createPublicClient, fromHex, Hex, http, namehash, parseAbi, toHex } from "viem";
import * as chains from "viem/chains";

import { decodeAddress } from "../address/index.js";
import { ChainTypeName, ChainTypeValue } from "../constants/interopAddress.js";

// WORKAROUNDS for cid.eth registry bugs (https://github.com/unruggable-labs/chain-resolver):
// 1. Registry uses 0x0001 for eip155 chain type, but ERC-7930 specifies 0x0000
// 2. Registry sometimes omits the trailing address length byte (0x00) for chain-only addresses
const REGISTRY_CHAIN_TYPE_FIX: Record<number, ChainTypeValue> = {
    0x0001: ChainTypeValue.EIP155, // Registry uses 0x0001, should be 0x0000
};

// Standard ENS registry address (same on all networks)
const ENS_REGISTRY_ADDRESS: Address = "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e";

// Registry ABI for resolver lookup
const ENS_REGISTRY_ABI = parseAbi(["function resolver(bytes32 node) view returns (address)"]);

// ChainResolver ABI - direct getter takes the label string (not labelhash)
const CHAIN_RESOLVER_ABI = parseAbi([
    "function interoperableAddress(string label) view returns (bytes)",
]);

export interface ResolvedChainFromRegistry {
    chainType: ChainTypeName;
    chainReference: string;
}

/**
 * Resolves a chain label to chainType and chainReference using an onchain ENS-based registry.
 *
 * This implements forward resolution via the ChainResolver contract:
 * 1. Gets the resolver for the registry domain (e.g., cid.eth) from ENS registry
 * 2. Calls interoperableAddress(label) on the resolver with the label string
 * 3. Decodes the returned ERC-7930 binary format
 *
 * @param label - The chain label to resolve (e.g., "optimism", "arbitrum", "base")
 * @param registryDomain - The ENS registry domain (e.g., "cid.eth", "on.eth")
 * @returns The resolved chainType and chainReference, or null if resolution fails
 *
 * @example
 * ```ts
 * // Resolve "optimism" using cid.eth registry
 * const result = await resolveChainFromRegistry("optimism", "cid.eth");
 * // result: { chainType: "eip155", chainReference: "10" }
 * ```
 */
export async function resolveChainFromRegistry(
    label: string,
    registryDomain: string,
): Promise<ResolvedChainFromRegistry | null> {
    try {
        const client = createPublicClient({
            chain: chains.mainnet,
            transport: http(process.env.MAINNET_RPC_URL),
        });

        // 1. Get the resolver for the registry domain (e.g., cid.eth)
        const registryNode = namehash(registryDomain);
        const resolverAddress = await client.readContract({
            address: ENS_REGISTRY_ADDRESS,
            abi: ENS_REGISTRY_ABI,
            functionName: "resolver",
            args: [registryNode],
        });

        const resolverAddr = resolverAddress as Address | undefined;
        if (!resolverAddr || resolverAddr === "0x0000000000000000000000000000000000000000") {
            return null;
        }

        // 2. Call interoperableAddress(label) on the resolver with the label string directly
        const interopAddrBytes = await client.readContract({
            address: resolverAddr,
            abi: CHAIN_RESOLVER_ABI,
            functionName: "interoperableAddress",
            args: [label],
        });

        if (!interopAddrBytes || interopAddrBytes === "0x") {
            return null;
        }

        // 3. Patch registry bugs in the returned bytes
        let bytes = fromHex(interopAddrBytes as Hex, "bytes");

        if (bytes.length < 6) {
            return null; // Too short to be valid
        }

        // WORKAROUND: Fix incorrect chain type (0x0001 -> 0x0000 for eip155)
        const chainTypeByte2 = bytes[2];
        const chainTypeByte3 = bytes[3];
        if (chainTypeByte2 === undefined || chainTypeByte3 === undefined) {
            return null;
        }
        const registryChainType = (chainTypeByte2 << 8) | chainTypeByte3;
        const correctedChainType = REGISTRY_CHAIN_TYPE_FIX[registryChainType];

        if (correctedChainType) {
            const correctedBytes = fromHex(correctedChainType, "bytes");
            bytes[2] = correctedBytes[0]!;
            bytes[3] = correctedBytes[1]!;
        }

        // WORKAROUND: Registry sometimes omits the address length byte (should be 0x00 for chain-only)
        // Expected length: 2 (version) + 2 (chainType) + 1 (chainRefLen) + chainRefLen + 1 (addrLen)
        const chainRefLen = bytes[4];
        if (chainRefLen === undefined) {
            return null;
        }
        const expectedLength = 6 + chainRefLen;
        if (bytes.length === expectedLength - 1) {
            // Missing address length byte, append 0x00
            const fixedBytes = new Uint8Array(bytes.length + 1);
            fixedBytes.set(bytes);
            fixedBytes[bytes.length] = 0x00;
            bytes = fixedBytes;
        }

        // 4. Decode using standard decodeAddress
        const decoded = decodeAddress(toHex(bytes), { representation: "text" });

        return {
            chainType: decoded.chainType as ChainTypeName,
            chainReference: decoded.chainReference ?? "",
        };
    } catch {
        // Return null on any error to allow fallback to offchain resolution
        return null;
    }
}
