/**
 * Verifies the LifiOpenedIntentParser decodes the Open event emitted by the
 * real LiFi solver on-chain. Guards against ABI drift: if the on-chain event
 * layout (notably `maxSpent` encoded as `uint256[2][]`) ever stops matching
 * the parser's ABI, this test fails.
 */
import { base } from "viem/chains";
import { describe, expect, it } from "vitest";

import { LifiOpenedIntentParser } from "../../src/protocols/lifi-intents/services/LifiOpenedIntentParser.js";
import { useAnvilFork } from "../helpers/anvilFork.js";
import { LIFI_INTENTS_OPEN_BASE } from "../mocks/mainnetTransactions.js";

describe("LifiOpenedIntentParser (anvil fork)", () => {
    const fork = useAnvilFork(base, 8560);

    it("decodes the Open event on a real Base tx", async () => {
        if (!fork.current) return;

        const parser = new LifiOpenedIntentParser({
            clientManager: fork.current.clientManager,
        });

        const opened = await parser.getOpenedIntent(
            LIFI_INTENTS_OPEN_BASE.txHash,
            LIFI_INTENTS_OPEN_BASE.originChainId,
        );

        expect(opened.orderId).toBe(LIFI_INTENTS_OPEN_BASE.orderId);
        expect(opened.user).toBe(LIFI_INTENTS_OPEN_BASE.user);
        expect(opened.originChainId).toBe(LIFI_INTENTS_OPEN_BASE.originChainId);
        expect(opened.txHash).toBe(LIFI_INTENTS_OPEN_BASE.txHash);
        expect(opened.maxSpent.length).toBeGreaterThan(0);
        expect(opened.fillInstructions.length).toBeGreaterThan(0);
        expect(opened.fillInstructions[0]?.destinationChainId).toBe(
            LIFI_INTENTS_OPEN_BASE.destinationChainId,
        );
    }, 30000);
});
