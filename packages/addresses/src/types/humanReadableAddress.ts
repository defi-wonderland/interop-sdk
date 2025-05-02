import type { Checksum } from "../internal.js";

/**
 * Represents an interop address in a human readable format.
 * @example 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045@eip155:1#4CA88C9C
 */
export type HumanReadableAddress = `${string}@${string}:${string}#${Checksum}`;
