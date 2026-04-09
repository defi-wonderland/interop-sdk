/** Thrown when buildQuote is called with the same asset on the same chain. */
export class SameChainIntentNotAllowed extends Error {
    constructor() {
        super("buildQuote does not support same-chain intents. Use a direct transfer instead.");
        this.name = "SameChainIntentNotAllowed";
    }
}
