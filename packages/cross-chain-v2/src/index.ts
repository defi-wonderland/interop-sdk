// Types
export type {
    Intent,
    SubmitContext,
    TrackingRef,
    TrackingOptions,
    PreparedAction,
    PreparedTx,
    PreparedSign,
    ConfirmResult,
} from "./types/intent.js";
export type {
    SwapIntent,
    SwapQuoteRequest,
    SwapQuote,
    SwapOrderUpdate,
    SwapOrderStatus,
    ApprovalRequirement,
} from "./types/swap.js";

// Errors
export {
    SdkError,
    QuoteFetchError,
    QuoteValidationError,
    QuoteTimeoutError,
    SubmitError,
    PayloadValidationError,
    SettlerValidationError,
    TrackingError,
    TrackingRefInvalidError,
    TrackingTimeoutError,
    OriginTxRevertedError,
    OpenEventParseError,
    AssetDiscoveryError,
    UnsupportedProtocolError,
    IntentNotFoundError,
} from "./errors.js";

// Clients
export { OIFClient } from "./clients/OIFClient.js";
export type { OIFClientConfig } from "./clients/OIFClient.js";
export { AcrossClient } from "./clients/AcrossClient.js";
export type { AcrossClientConfig } from "./clients/AcrossClient.js";
export { RelayClient } from "./clients/RelayClient.js";
export type {
    RelayClientConfig,
    RelayQuoteRequest,
    RelayQuoteResponse,
    RelayStatusResponse,
} from "./clients/RelayClient.js";

// Intents
export { OIFEscrowSwap } from "./intents/oif/OIFEscrowSwap.js";
export { OIFUserOpenSwap } from "./intents/oif/OIFUserOpenSwap.js";
export { AcrossSwap } from "./intents/across/AcrossSwap.js";
export { RelaySwap } from "./intents/relay/RelaySwap.js";

// Aggregator
export { SwapIntentAggregator } from "./aggregator/SwapIntentAggregator.js";
export type {
    SwapIntentAggregatorConfig,
    IntentEntry,
    SwapQuoteResult,
    SwapQuoteError,
    CreateAggregatorConfig,
    OIFProviderConfig,
    OIFSolverEntry,
    OIFVariant,
    TrackingListener,
} from "./aggregator/SwapIntentAggregator.js";

// Asset Discovery
export type {
    AssetInfo,
    NetworkAssets,
    AssetDiscoveryResult,
    AssetDiscoveryOptions,
    AssetDiscoveryService,
} from "./discovery/types.js";
export { BaseAssetDiscovery } from "./discovery/BaseAssetDiscovery.js";
export type { BaseAssetDiscoveryConfig } from "./discovery/BaseAssetDiscovery.js";
export { OIFAssetDiscovery } from "./discovery/OIFAssetDiscovery.js";
export type { OIFAssetDiscoveryConfig } from "./discovery/OIFAssetDiscovery.js";
export { AcrossAssetDiscovery } from "./discovery/AcrossAssetDiscovery.js";
export type { AcrossAssetDiscoveryConfig } from "./discovery/AcrossAssetDiscovery.js";
