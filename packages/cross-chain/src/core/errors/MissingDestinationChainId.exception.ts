/**
 * Thrown when `OrderTracker.watchOrder` is called on the API tracking path
 * without a `destinationChainId`. The fill watcher requires it to query the
 * destination leg, so we fail fast at the entrypoint with a clear message
 * instead of surfacing a confusing error from deep inside the watcher.
 */
export class MissingDestinationChainId extends Error {
    constructor(reason: "api-tracking" | "order-fill-instructions") {
        const detail =
            reason === "api-tracking"
                ? "watchOrder requires `destinationChainId` for API tracking. Pass it explicitly when using tracking: 'api' or orderId-based tracking."
                : "Order has no destination chain in fillInstructions";
        super(detail);
        this.name = "MissingDestinationChainId";
    }
}
