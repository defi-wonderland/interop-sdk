import bs58 from "bs58";
import { createPublicClient, hexToBytes, http, keccak256 } from "viem";
import * as chains from "viem/chains";
import { normalize } from "viem/ens";

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
    input: string | undefined,
    type: "hex" | "base58" | "base64" | "decimal",
): Uint8Array => {
    if (!input) {
        return new Uint8Array();
    }

    switch (type) {
        case "hex":
            if (input.startsWith("0x")) {
                return hexToBytes(input as `0x${string}`);
            }
            return hexToBytes(`0x${input}`);
        case "base58":
            return bs58.decode(input);
        case "base64":
            return new Uint8Array(
                atob(input)
                    .split("")
                    .map((c) => c.charCodeAt(0)),
            );
        case "decimal":
            return convertToBytes(Number(input).toString(16), "hex");
        default:
            throw new Error("Invalid type");
    }
};

const parseAddress = async (address: string): Promise<Uint8Array> => {
    if (address.includes(".eth")) {
        const client = createPublicClient({
            chain: chains.mainnet,
            transport: http(),
        });
        const ensAddress = await client.getEnsAddress({ name: normalize(address) });
        if (ensAddress) {
            return convertToBytes(ensAddress, "hex");
        } else {
            throw new Error("ENS name not found");
        }
    }
    return convertToBytes(address, "hex");
};

const validateChain = (chainPart: string): boolean => {
    const chainNamespace = chainPart.includes(":") ? chainPart.split(":")[0] : "";
    const chainReference = chainPart.includes(":") ? chainPart.split(":")[1] : "";

    const chainId = Number(chainReference);
    if (isNaN(chainId)) {
        return false;
    }

    return Object.values(chains)
        .filter((x) => "id" in x)
        .find((x) => x.id === chainId)
        ? true
        : false;
};

export const parseHumanReadable = async (humanReadableAddress: string): Promise<InteropAddress> => {
    const INTEROP_HUMAN_REGEX =
        /^([.\-:_%a-zA-Z0-9]*)@([a-zA-Z0-9]*:?[a-zA-Z0-9]*)?#([A-F0-9]{8})$/;
    const interopHumanMatch = humanReadableAddress.match(INTEROP_HUMAN_REGEX);

    if (!interopHumanMatch) {
        throw new Error("Invalid human address");
    }
    const [, address, chainPart, checksum] = interopHumanMatch;

    if (!chainPart) {
        throw new Error("Invalid human address");
    }

    if (!validateChain(chainPart)) {
        throw new Error("Invalid chain");
    }

    const chainNamespace = chainPart.includes(":") ? chainPart.split(":")[0] : "";
    const chainReference = chainPart.includes(":") ? chainPart.split(":")[1] : "";

    const addressBytes = address ? await parseAddress(address) : new Uint8Array();
    const chainReferenceBytes = chainReference
        ? convertToBytes(chainReference, "decimal")
        : new Uint8Array();
    const chainTypeBytes = chainNamespace
        ? convertToBytes(CHAIN_TYPE[chainNamespace], "hex")
        : new Uint8Array();

    const interopAddress: InteropAddress = {
        version: 1,
        address: addressBytes,
        chainType: chainTypeBytes,
        chainReference: chainReferenceBytes,
    };

    // TODO: validate checksum
    // validateChecksum(interopAddress, checksum)

    return interopAddress;
};
