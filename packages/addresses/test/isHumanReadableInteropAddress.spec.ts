import { describe, expect, it } from "vitest";

import { HumanReadableAddress, isHumanReadableInteropAddress } from "../src/internal.js";

const testAddress = (address: string, expected: boolean): void => {
    it(`${expected ? "true" : "false"} for ${address}`, async () => {
        expect(await isHumanReadableInteropAddress(address as HumanReadableAddress)).toBe(expected);
    });
};

describe("isHumanReadableInteropAddress", () => {
    testAddress("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045@eip155:1#4CA88C9C", true);

    testAddress("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045@eip155:8453#17DE0709", true);

    testAddress(
        "MJKqp326RZCHnAAbew9MDdui3iCKWco7fsK9sVuZTX2@solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d#88835C11",
        true,
    );

    testAddress("@eip155:1#F54D4FBF", true);

    testAddress("MJKqp326RZCHnAAbew9MDdui3iCKWco7fsK9sVuZTX2@solana:#18D1CBB4", true);

    testAddress("@solana:#F40BB840", true);
});
