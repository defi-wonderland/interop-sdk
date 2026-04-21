import type { PublicClient } from "viem";

import type { ApprovalAmountStrategy, ApprovalReadFailure, ApprovalService } from "../internal.js";
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
     * Invoked when an allowance read fails for an entire chain batch
     * (RPC down, multicall rejected, or chain unknown to viem).
     *
     * Defaults to `console.warn` so misconfigurations are visible. Pass
     * `() => {}` to silence. Individual probe reverts do not trigger this.
     */
    onReadFailure?: (failure: ApprovalReadFailure) => void;
}

const defaultOnReadFailure = ({ chainId, reason, error }: ApprovalReadFailure): void => {
    console.warn(
        `[ApprovalService] allowance read failed (chainId=${chainId}, reason=${reason}):`,
        error,
    );
};

export function createApprovalService(config?: CreateApprovalServiceConfig): ApprovalService {
    const clientManager = new PublicClientManager(config?.publicClient, config?.rpcUrls);
    const onReadFailure = config?.onReadFailure ?? defaultOnReadFailure;
    const reader = new MulticallAllowanceReader(clientManager, onReadFailure);
    const strategy = config?.amountStrategy ?? new ExactAmountStrategy();
    return new DefaultApprovalService(reader, strategy, config?.approvalGasLimit);
}
