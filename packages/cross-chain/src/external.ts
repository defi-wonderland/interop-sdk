export * from "./core/errors/index.js";
export * from "./core/interfaces/index.js";
export * from "./core/types/index.js";
export * from "./core/sorting_strategies/index.js";
export * from "./core/constants/chains.js";
export * from "./core/constants/tokens.js";
export { PERMIT2_TYPES, EIP3009_TYPES } from "./protocols/oif/constants.js";

export {
    AcrossProvider,
    OifProvider,
    createCrossChainProvider,
    Aggregator,
    createAggregator,
    createOrderTracker,
    OrderTracker,
    OrderTrackerFactory,
    OIFOpenedIntentParser,
    CustomEventOpenedIntentParser,
    SortingStrategyFactory,
    BaseAssetDiscoveryService,
    StaticAssetDiscoveryService,
    OIFAssetDiscoveryService,
    CustomApiAssetDiscoveryService,
    AssetDiscoveryFactory,
    createAssetDiscoveryService,
    createOIFAssetDiscoveryService,
    isNativeAddress,
    // Step-based helpers
    getSignatureSteps,
    getTransactionSteps,
    isSignatureOnlyOrder,
    isTransactionOnlyOrder,
    // Address conversion
    toInteropAccountId,
    fromInteropAccountId,
    // Type adapters (SDK ↔ OIF wire format)
    adaptQuoteRequest,
    adaptOifOrder,
    adaptQuote,
} from "./internal.js";
