/**
 * Verifies that a real Across fill tx with failed destination calls
 * contains the CallsFailed event in its receipt.
 */
import { keccak256, toBytes } from "viem";
import { arbitrum } from "viem/chains";
import { describe, expect, it } from "vitest";

import { useAnvilFork } from "../helpers/anvilFork.js";
import { ACROSS_FAILED_DESTINATION_SWAP } from "../mocks/mainnetTransactions.js";

const CALLS_FAILED_TOPIC = keccak256(toBytes("CallsFailed((address,bytes,uint256)[],address)"));

describe("Across destination call failure detection (anvil fork)", () => {
    const fork = useAnvilFork(arbitrum);

    it("fill tx receipt should contain CallsFailed event", async () => {
        if (!fork.current) return;

        const receipt = await fork.current.client.getTransactionReceipt({
            hash: ACROSS_FAILED_DESTINATION_SWAP.fillTxHash,
        });

        expect(receipt.status).toBe("success");
        expect(receipt.logs.some((log) => log.topics[0] === CALLS_FAILED_TOPIC)).toBe(true);
    }, 30000);
});
