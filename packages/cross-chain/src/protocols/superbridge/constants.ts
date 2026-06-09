/** Default Superbridge API base URL. */
export const SUPERBRIDGE_API_URL = "https://api.superbridge.app";

/** Protocol identifier for the Superbridge provider. */
export const SUPERBRIDGE_PROTOCOL_NAME = "superbridge";

/** Execution modes used by default when none are configured. */
export const SUPERBRIDGE_DEFAULT_SUBMISSION_MODES = ["user-transaction"] as const;

/** Default per-request timeout (ms) so HTTP calls cannot hang indefinitely. */
export const SUPERBRIDGE_REQUEST_TIMEOUT_MS = 30_000;

/** Default slippage sent to `/v1/routes`. Native/canonical bridges are 1:1, so 0. */
export const SUPERBRIDGE_DEFAULT_SLIPPAGE = 0;

/** Canonical/native rollup bridge route identifiers. Used to filter `/v1/routes` to native bridging. */
export const SUPERBRIDGE_CANONICAL_ROUTE_IDS = [
    "op-deposit-cdm",
    "op-deposit-portal",
    "op-withdrawal-cdm",
    "op-withdrawal-messagepasser",
    "arb-deposit-retryable",
    "ArbitrumWithdrawal",
    "ZksyncDeposit",
    "ZksyncWithdrawal",
    "TaikoDeposit",
    "TaikoWithdrawal",
    "LineaDeposit",
    "LineaWithdrawal",
    "StarknetDeposit",
    "StarknetWithdrawal",
    "LxlyDeposit",
    "LxlyWithdrawal",
    "LxlyCross",
] as const;
