/** Thrown when the destination chain id is required but cannot be resolved. */
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
