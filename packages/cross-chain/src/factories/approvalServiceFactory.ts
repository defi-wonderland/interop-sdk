import type { PublicClient } from "viem";

import type {
    AllowanceReadFailureHandler,
    ApprovalAmountStrategy,
    ApprovalService,
} from "../internal.js";
import {
    DefaultApprovalService,
    ExactAmountStrategy,
    MulticallAllowanceReader,
    PublicClientManager,
} from "../internal.js";

export interface CreateApprovalServiceConfig {
    /** RPC URLs per chain ID, used when no custom client is provided. */
    rpcUrls?: Record<number, string>;
    /** Pre-configured public client. Takes precedence over `rpcUrls`. */
    publicClient?: PublicClient;
    /**
     * Strategy that decides the amount granted by each approval.
     * Defaults to {@link ExactAmountStrategy}.
     */
    amountStrategy?: ApprovalAmountStrategy;
    /**
     * Custom gas limit forwarded to every approval transaction built by this
     * service. When omitted the `gas` field is left unset so the wallet or
     * relayer estimates it.
     */
    approvalGasLimit?: bigint;
    /**
     * Handler invoked when a whole allowance batch read fails. Defaults to
     * {@link DefaultAllowanceReadFailureHandler} (logs through
     * `console.warn`). Provide your own implementation to route failures into
     * custom telemetry, or a no-op handler to silence them.
     */
    failureHandler?: AllowanceReadFailureHandler;
}

export function createApprovalService(config?: CreateApprovalServiceConfig): ApprovalService {
    const clientManager = new PublicClientManager(config?.publicClient, config?.rpcUrls);
    const reader = new MulticallAllowanceReader(clientManager, config?.failureHandler);
    const strategy = config?.amountStrategy ?? new ExactAmountStrategy();
    return new DefaultApprovalService(reader, strategy, config?.approvalGasLimit);
}
