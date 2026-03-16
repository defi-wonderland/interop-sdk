// Known Starknet chain IDs (case-sensitive ASCII strings).
// https://namespaces.chainagnostic.org/starknet/caip2
const KNOWN_CHAIN_IDS = new Set(["SN_MAIN", "SN_GOERLI", "SN_SEPOLIA"]);

export function isValidStarknetChainReference(chainReference: string): boolean {
    return KNOWN_CHAIN_IDS.has(chainReference);
}
