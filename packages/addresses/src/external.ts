// Provider convenience methods (high-level API)
export * from "./providers/index.js";

// Types
export type {
    InteroperableAddress,
    InteroperableAddressBinary,
    InteroperableAddressText,
    BinaryAddress,
    InteroperableName,
} from "./types/index.js";

export type { ParsedInteroperableNameResult } from "./name/index.js";

// Address layer functions (direct access, not via provider)
export {
    decodeAddress,
    encodeAddress,
    toBinaryRepresentation,
    toTextRepresentation,
    calculateChecksum,
    validateInteroperableAddress,
    validateChecksum,
} from "./address/index.js";

// Name layer functions (direct access, not via provider)
export { parseName, formatName } from "./name/index.js";

// Type guards
export { isTextAddress, isBinaryAddress } from "./types/interopAddress.js";
