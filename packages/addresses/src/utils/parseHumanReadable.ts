import bs58 from "bs58";
import { hexToBytes, keccak256 } from "viem";

import { CHAIN_TYPE, InteropAddress } from "../internal.js";

// TODO: validate checksum after toBinary implemented
// const calculateChecksum = (interopAddress: InteropAddress): string => {
//     const binaryAddress = toBinary(interopAddress)
//     const checksum = keccak256(binaryAddress.slice(2).slice(6))
//     return checksum.slice(2).slice(8).toUpperCase()
// }

// const validateChecksum = (interopAddress: InteropAddress, checksum: string): boolean => {
//     const calculatedChecksum = calculateChecksum(interopAddress)
//     return calculatedChecksum === checksum
// }

const convertToBytes = (
    bytes: string | undefined,
    type: "hex" | "base58" | "base64",
): Uint8Array => {
    if (!bytes) {
        return new Uint8Array();
    }

    switch (type) {
        case "hex":
            if (bytes.startsWith("0x")) {
                return hexToBytes(bytes as `0x${string}`);
            }
            return hexToBytes(`0x${bytes}`);
        case "base58":
            return bs58.decode(bytes);
        case "base64":
            return new Uint8Array(
                atob(bytes)
                    .split("")
                    .map((c) => c.charCodeAt(0)),
            );
        default:
            throw new Error("Invalid type");
    }
};

export const parseHumanReadable = (humanReadableAddress: string): InteropAddress => {
    const INTEROP_HUMAN_REGEX = /^([a-zA-Z0-9]*)@([a-zA-Z0-9]*:?[a-zA-Z0-9]*)?#([A-F0-9]{8})$/;
    const interopHumanMatch = humanReadableAddress.match(INTEROP_HUMAN_REGEX);

    if (!interopHumanMatch) {
        throw new Error("Invalid human address");
    }
    const [, address, chainPart, checksum] = interopHumanMatch;

    if (!chainPart) {
        throw new Error("Invalid human address");
    }

    const chainNamespace = chainPart.includes(":") ? chainPart.split(":")[0] : "";
    const chainId = chainPart.includes(":") ? chainPart.split(":")[1] : "";

    const addressBytes = address ? convertToBytes(address, "hex") : new Uint8Array();
    const chainReference = chainId ? convertToBytes(chainId, "hex") : new Uint8Array();
    const chainType = chainNamespace
        ? convertToBytes(CHAIN_TYPE[chainNamespace], "hex")
        : new Uint8Array();

    const interopAddress: InteropAddress = {
        version: 1,
        address: addressBytes,
        chainType,
        chainReference,
    };

    // TODO: validate checksum
    // validateChecksum(interopAddress, checksum)

    return interopAddress;
};
