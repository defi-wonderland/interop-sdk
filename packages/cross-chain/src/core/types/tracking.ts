import type { Hex } from "viem";

export type OnBeforeTrackingParams = {
    txHash: Hex;
    originChainId: number;
};

export type OnBeforeTracking = (params: OnBeforeTrackingParams) => Promise<void>;
