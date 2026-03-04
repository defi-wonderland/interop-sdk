import { Hex } from "viem";

/**
 * The default size of each ABI-encoded field in bytes.
 * In standard ABI encoding, each parameter occupies exactly 32 bytes (256 bits).
 */
const DEFAULT_FIELD_SIZE_BYTES = 32;

/**
 * Parses a field from ABI-encoded event data.
 *
 * ## Example Structure
 * For an event with 4 parameters (32 bytes each), the hex data looks like:
 * ```
 * 0x[param1: 64 chars][param2: 64 chars][param3: 64 chars][param4: 64 chars]
 *   ↑                ↑                ↑                ↑
 *   index 0          index 1          index 2          index 3
 * ```
 *
 * Note: The "0x" prefix is not included in the index calculation.
 *
 * @param dataHex - The hex-encoded data field from an event log (including "0x" prefix)
 * @param index - The zero-based index of the field to extract (0 = first field, 1 = second, etc.)
 * @param fieldSizeBytes - The size of each field in bytes (default: 32)
 * @returns The parsed BigInt value from the specified field
 */
export function parseAbiEncodedField(
    dataHex: Hex,
    index: number,
    fieldSizeBytes: number = DEFAULT_FIELD_SIZE_BYTES,
): bigint {
    // Each byte is represented by 2 hex characters
    // We add 2 to skip the "0x" prefix
    const startChar = 2 + index * fieldSizeBytes * 2;
    const endChar = startChar + fieldSizeBytes * 2;

    const hexValue = dataHex.slice(startChar, endChar);
    return BigInt(`0x${hexValue}`);
}

/**
 * Parses multiple fields from ABI-encoded event data.
 *
 * This is a convenience function for extracting multiple fields
 * from event data using simple indices.
 *
 * @param dataHex - The hex-encoded data field from an event log (including "0x" prefix)
 * @param indices - Array of zero-based indices for each field to extract
 * @param fieldSizeBytes - The size of each field in bytes (default: 32)
 * @returns Array of parsed BigInt values, one for each index
 */
export function parseAbiEncodedFields(
    dataHex: Hex,
    indices: number[],
    fieldSizeBytes: number = DEFAULT_FIELD_SIZE_BYTES,
): bigint[] {
    return indices.map((index) => parseAbiEncodedField(dataHex, index, fieldSizeBytes));
}
