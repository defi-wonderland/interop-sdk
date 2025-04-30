import { fromBytes, toBytes } from "viem";

import type { InteropAddress } from "../types/interopAddress.js";

export const toBinary = (interopAddress: InteropAddress): string => {
    const version = toBytes(interopAddress.version, { size: 2 });
    const chainType = interopAddress.chainType;
    const chainReference = interopAddress.chainReference;
    const chainReferenceLength = toBytes(chainReference.length, { size: 1 });
    const address = interopAddress.address;
    const addressLength = toBytes(address.length, { size: 1 });

    return fromBytes(
        new Uint8Array([
            ...version,
            ...chainType,
            ...chainReferenceLength,
            ...chainReference,
            ...addressLength,
            ...address,
        ]),
        "hex",
    );
};
