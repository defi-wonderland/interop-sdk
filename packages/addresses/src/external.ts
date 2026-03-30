// Provider convenience methods (high-level API)
export * from "./providers/index.js";

// Types
export type {
    InteroperableAddress,
    InteroperableAddressBinary,
    InteroperableAddressText,
    BinaryAddress,
    InteroperableName,
    ChainIdentifier,
    ChainIdentifierParts,
} from "./types/index.js";

export type { ParsedInteroperableNameResult, ParseNameOptions } from "./name/index.js";

// Address layer functions (direct access, not via provider)
export type { FormatResult } from "./address/index.js";
export {
    decodeAddress,
    encodeAddress,
    toBinaryRepresentation,
    toTextRepresentation,
    calculateChecksum,
    validateInteroperableAddress,
    validateChecksum,
} from "./address/index.js";

// Chain identifier helpers
export { toChainIdentifier, fromChainIdentifier } from "./address/chainIdentifier.js";

// Name layer functions (direct access, not via provider)
export {
    parseName,
    formatName,
    resolveAddress,
    resolveChain,
    resolveChainFromRegistry,
    getRegisteredChains,
    shortnameToChainId,
    isValidChain,
    isValidChainType,
} from "./name/index.js";
export type { RegisteredChain, GetRegisteredChainsOptions } from "./name/index.js";

// Error classes
export {
    AddressResolutionFailed,
    BytesConversionFailed,
    ChecksumMismatchWarning,
    ENSLookupFailed,
    ENSNotFound,
    FieldNotPresent,
    InvalidAddress,
    InvalidBinaryInteropAddress,
    InvalidChainIdentifier,
    InvalidChainReference,
    InvalidChainType,
    InvalidChecksum,
    InvalidConversionType,
    InvalidDecimal,
    InvalidInteroperableAddress,
    InvalidInteroperableName,
    MissingInteroperableName,
    UnsupportedChainType,
} from "./errors/index.js";

// Type guards
export { isTextAddress, isBinaryAddress } from "./types/interopAddress.js";
