import { z } from "zod";

// ── Common ─────────────────────────────────────────────

/** Schema for a token in Bungee API responses. */
export const BungeeTokenSchema = z.object({
    chainId: z.number(),
    address: z.string(),
    name: z.string(),
    symbol: z.string(),
    decimals: z.number(),
    logoURI: z.string().optional(),
    icon: z.string().optional(),
});

/** Schema for an input entry in Bungee API responses. */
export const BungeeInputSchema = z.object({
    token: BungeeTokenSchema,
    amount: z.string(),
    priceInUsd: z.number(),
    valueInUsd: z.number(),
});

/** Schema for an output entry in Bungee API responses. */
export const BungeeOutputSchema = z.object({
    token: BungeeTokenSchema,
    amount: z.string(),
    effectiveAmount: z.string().optional(),
    priceInUsd: z.number(),
    valueInUsd: z.number(),
    effectiveValueInUsd: z.number().optional(),
    minAmountOut: z.string(),
    effectiveReceivedInUsd: z.number(),
});

/** Schema for approval data in Bungee API responses. */
export const BungeeApprovalDataSchema = z.object({
    spenderAddress: z.string(),
    amount: z.string(),
    tokenAddress: z.string(),
    userAddress: z.string(),
});

/** Schema for gas fee data in Bungee API responses. */
export const BungeeGasFeeSchema = z.object({
    gasToken: BungeeTokenSchema,
    gasLimit: z.string(),
    gasPrice: z.string(),
    estimatedFee: z.string(),
    feeInUsd: z.number(),
});

/** Schema for a route fee in Bungee API responses. */
export const BungeeRouteFeeSchema = z.object({
    token: BungeeTokenSchema,
    amount: z.string(),
    feeInUsd: z.number(),
    priceInUsd: z.number(),
});

/** Schema for dex details in Bungee API responses. */
export const BungeeDexDetailsSchema = z.object({
    protocol: z.object({
        name: z.string(),
        displayName: z.string(),
        icon: z.string(),
    }),
    minAmountOut: z.string(),
    outputTokenAddress: z.string(),
    inputTokenAddress: z.string(),
    amountOut: z.string(),
    slippage: z.number(),
});

/** Schema for route details in Bungee API responses. */
export const BungeeRouteDetailsSchema = z.object({
    name: z.string(),
    logoURI: z.string(),
    routeFee: BungeeRouteFeeSchema.nullable().optional(),
    dexDetails: BungeeDexDetailsSchema.nullable().optional(),
});

/** Schema for transaction data in Bungee API responses. */
export const BungeeTxDataSchema = z.object({
    to: z.string().optional(),
    data: z.union([z.string(), z.record(z.unknown())]),
    value: z.string(),
    chainId: z.number(),
    type: z.string().optional(),
});

/** Schema for EIP-712 sign typed data in Bungee API responses. */
export const BungeeSignTypedDataSchema = z.object({
    domain: z.record(z.unknown()),
    types: z.record(z.unknown()),
    values: z.record(z.unknown()),
});

/** Schema for refuel input in Bungee API responses. */
export const BungeeRefuelInputSchema = z.object({
    token: BungeeTokenSchema,
    amount: z.string(),
});

/** Schema for refuel output in Bungee API responses. */
export const BungeeRefuelOutputSchema = z.object({
    token: BungeeTokenSchema,
    amount: z.string(),
});

/** Schema for refuel data in Bungee API responses. */
export const BungeeRefuelSchema = z.object({
    input: BungeeRefuelInputSchema.nullable().optional(),
    output: BungeeRefuelOutputSchema,
});

/** Schema for affiliate fee in Bungee API responses. */
export const BungeeAffiliateFeeSchema = z.object({
    token: BungeeTokenSchema,
    amount: z.string(),
    feeTakerAddress: z.string(),
});

/** Schema for rewards data in Bungee auto route responses. */
export const BungeeRewardsSchema = z.object({
    rebateAmount: z.string(),
    rewardAmount: z.string(),
    totalRewardAmount: z.string(),
    totalRewardAmountInUsd: z.number(),
    token: BungeeTokenSchema,
    isRewardEnabled: z.boolean(),
});

// ── Quote ──────────────────────────────────────────────

/** Schema for an auto route in a Bungee quote response. */
export const BungeeAutoRouteSchema = z
    .object({
        userOp: z.string(),
        requestHash: z.string(),
        output: BungeeOutputSchema,
        requestType: z.string(),
        approvalData: BungeeApprovalDataSchema.nullable().optional(),
        affiliateFee: BungeeAffiliateFeeSchema.nullable().optional(),
        signTypedData: BungeeSignTypedDataSchema.nullable().optional(),
        gasFee: BungeeGasFeeSchema.nullable().optional(),
        txData: BungeeTxDataSchema.nullable().optional(),
        slippage: z.number(),
        suggestedClientSlippage: z.number().optional(),
        estimatedTime: z.number(),
        routeDetails: BungeeRouteDetailsSchema,
        refuel: BungeeRefuelSchema.nullable().optional(),
        quoteId: z.string(),
        quoteExpiry: z.number(),
        rewards: BungeeRewardsSchema.optional(),
        routeTags: z.array(z.string()),
        refundAddress: z.string().optional(),
    })
    .passthrough();

/** Schema for a manual route in a Bungee quote response. */
export const BungeeManualRouteSchema = z.object({
    quoteId: z.string(),
    quoteExpiry: z.number().optional(),
    output: BungeeOutputSchema,
    affiliateFee: BungeeAffiliateFeeSchema.nullable().optional(),
    approvalData: BungeeApprovalDataSchema.nullable().optional(),
    gasFee: BungeeGasFeeSchema,
    slippage: z.number(),
    estimatedTime: z.number(),
    routeDetails: BungeeRouteDetailsSchema,
    refuel: BungeeRefuelSchema.nullable().optional(),
});

/** Schema for the Bungee GET `/api/v1/bungee/quote` query parameters. */
export const BungeeQuoteRequestSchema = z.object({
    userAddress: z.string().optional(),
    originChainId: z.string(),
    destinationChainId: z.string(),
    inputToken: z.string(),
    inputAmount: z.string(),
    receiverAddress: z.string(),
    outputToken: z.string(),
    slippage: z.string().optional(),
    delegateAddress: z.string().optional(),
    refuel: z.string().optional(),
    destinationPayload: z.string().optional(),
    destinationGasLimit: z.string().optional(),
    feeBps: z.string().optional(),
    feeTakerAddress: z.string().optional(),
    enableManual: z.string().optional(),
    disableSwapping: z.string().optional(),
    disableAuto: z.string().optional(),
    excludeBridges: z.string().optional(),
    includeDexes: z.string().optional(),
    excludeDexes: z.string().optional(),
    includeBridges: z.string().optional(),
    exclusiveTransmitter: z.string().optional(),
    useInbox: z.string().optional(),
    enableMultipleAutoRoutes: z.string().optional(),
    useDepositAddress: z.string().optional(),
    enableDepositAddress: z.string().optional(),
    refundAddress: z.string().optional(),
    depositDestinationMemo: z.string().optional(),
});

/** Schema for the destination exec data in a quote response. */
const BungeeDestinationExecSchema = z
    .object({
        destinationPayload: z.string(),
        destinationGasLimit: z.string(),
    })
    .nullable();

/** Schema for a deposit route in a quote response. */
const BungeeDepositRouteSchema = z
    .object({
        depositAddress: z.string(),
        quoteId: z.string(),
        userOp: z.string(),
        totalFeeBps: z.string().optional(),
    })
    .passthrough();

/** Schema for a Socket Core deposit route in a quote response. */
const BungeeSocketCoreDepositRouteSchema = z.object({
    requestHash: z.string(),
    userOp: z.string(),
    depositData: z.object({
        address: z.string(),
        token: z.string(),
        amount: z.string(),
        chainId: z.number(),
        memo: z.string().optional(),
    }),
    totalFeeBps: z.string().optional(),
    expiry: z.number(),
    refundAddress: z.string().optional(),
});

/** Schema for the result object in a Bungee quote response. */
export const BungeeQuoteResultSchema = z
    .object({
        originChainId: z.number(),
        destinationChainId: z.number(),
        userAddress: z.string(),
        receiverAddress: z.string(),
        input: BungeeInputSchema,
        destinationExec: BungeeDestinationExecSchema.optional(),
        autoRoute: BungeeAutoRouteSchema.nullable().optional(),
        autoRoutes: z.array(BungeeAutoRouteSchema).optional(),
        manualRoutes: z.array(BungeeManualRouteSchema).optional(),
        depositRoute: BungeeDepositRouteSchema.nullable().optional(),
        deposit: BungeeSocketCoreDepositRouteSchema.optional(),
    })
    .passthrough();

/** Schema for the Bungee quote response wrapper. */
export const BungeeQuoteResponseSchema = z.object({
    success: z.boolean(),
    statusCode: z.number(),
    result: BungeeQuoteResultSchema,
    message: z.string().nullable().optional(),
});

// ── Build Tx ───────────────────────────────────────────

/** Schema for the Bungee GET `/api/v1/bungee/build-tx` query parameters. */
export const BungeeBuildTxRequestSchema = z.object({
    quoteId: z.string(),
});

/** Schema for the result object in a Bungee build-tx response. */
export const BungeeBuildTxResultSchema = z.object({
    userOp: z.string(),
    txData: BungeeTxDataSchema,
    approvalData: BungeeApprovalDataSchema.nullable().optional(),
});

/** Schema for the Bungee build-tx response wrapper. */
export const BungeeBuildTxResponseSchema = z.object({
    success: z.boolean(),
    statusCode: z.number(),
    result: BungeeBuildTxResultSchema,
    message: z.string().nullable().optional(),
});

// ── Submit ─────────────────────────────────────────────

/** Schema for the Bungee POST `/api/v1/bungee/submit` request body. */
export const BungeeSubmitRequestSchema = z.object({
    request: z.record(z.unknown()),
    userSignature: z.string(),
    requestType: z.enum(["SINGLE_OUTPUT_REQUEST", "SWAP_REQUEST"]),
    quoteId: z.string(),
});

/** Schema for a single result entry in a Bungee submit response. */
export const BungeeSubmitResultSchema = z
    .object({
        hash: z.string().optional(),
        requestHash: z.string().optional(),
    })
    .passthrough();

/** Schema for the Bungee POST `/api/v1/bungee/submit` response body. */
export const BungeeSubmitResponseSchema = z.object({
    success: z.boolean(),
    statusCode: z.number(),
    result: z.union([BungeeSubmitResultSchema, z.array(BungeeSubmitResultSchema)]),
    message: z.string().nullable().optional(),
});

// ── Status ─────────────────────────────────────────────

/** Schema for the Bungee GET `/api/v1/bungee/status` query parameters. */
export const BungeeStatusRequestSchema = z.object({
    requestHash: z.string().optional(),
    txHash: z.string().optional(),
});

/** Schema for a status input token entry. */
export const BungeeStatusInputTokenSchema = z.object({
    token: BungeeTokenSchema,
    amount: z.string(),
    priceInUsd: z.number(),
    valueInUsd: z.number(),
});

/** Schema for a status output token entry. */
export const BungeeStatusOutputTokenSchema = z.object({
    token: BungeeTokenSchema,
    amount: z.string(),
    priceInUsd: z.number(),
    valueInUsd: z.number(),
    minAmountOut: z.string(),
});

/** Schema for origin data in a Bungee status response. */
export const BungeeOriginDataSchema = z.object({
    input: z.array(BungeeStatusInputTokenSchema),
    originChainId: z.number(),
    txHash: z.string().nullable(),
    status: z.string(),
    userAddress: z.string(),
    timestamp: z.number().nullable().optional(),
});

/** Schema for destination data in a Bungee status response. */
export const BungeeDestinationDataSchema = z.object({
    output: z.array(BungeeStatusOutputTokenSchema).nullable(),
    txHash: z.string().nullable(),
    destinationChainId: z.number(),
    receiverAddress: z.string(),
    status: z.string(),
    timestamp: z.number().nullable().optional(),
});

/** Schema for refund data in a Bungee status response. */
export const BungeeRefundSchema = z.object({
    chainId: z.number(),
    txHash: z.string(),
});

/** Schema for route details in a Bungee status response. */
const BungeeStatusRouteDetailsSchema = z.object({
    name: z.string(),
    logoURI: z.string(),
});

/** Schema for a single status result entry. */
export const BungeeStatusResultSchema = z.object({
    hash: z.string(),
    originData: BungeeOriginDataSchema,
    destinationData: BungeeDestinationDataSchema,
    routeDetails: BungeeStatusRouteDetailsSchema,
    bungeeStatusCode: z.number(),
    refund: BungeeRefundSchema.nullable().optional(),
});

/** Schema for the Bungee GET `/api/v1/bungee/status` response body. */
export const BungeeStatusResponseSchema = z.object({
    success: z.boolean(),
    statusCode: z.number(),
    result: z.array(BungeeStatusResultSchema),
    message: z.string().nullable().optional(),
});

// ── Token List ─────────────────────────────────────────

/** Schema for an extended token entry from the Bungee GET `/api/v1/tokens/list` response. */
export const BungeeTokenExtSchema = z.object({
    chainId: z.number(),
    address: z.string(),
    name: z.string(),
    symbol: z.string(),
    decimals: z.number(),
    logoURI: z.string().nullable().optional(),
    isShortListed: z.boolean().optional(),
    isVerified: z.boolean().optional(),
});

/** Schema for the Bungee GET `/api/v1/tokens/list` response body. */
export const BungeeTokenListResponseSchema = z.object({
    success: z.boolean(),
    statusCode: z.number(),
    result: z.record(z.string(), z.array(BungeeTokenExtSchema)),
    message: z.string().nullable().optional(),
});

// ── Types ──────────────────────────────────────────────

export type BungeeToken = z.infer<typeof BungeeTokenSchema>;
export type BungeeInput = z.infer<typeof BungeeInputSchema>;
export type BungeeOutput = z.infer<typeof BungeeOutputSchema>;
export type BungeeApprovalData = z.infer<typeof BungeeApprovalDataSchema>;
export type BungeeGasFee = z.infer<typeof BungeeGasFeeSchema>;
export type BungeeRouteFee = z.infer<typeof BungeeRouteFeeSchema>;
export type BungeeDexDetails = z.infer<typeof BungeeDexDetailsSchema>;
export type BungeeRouteDetails = z.infer<typeof BungeeRouteDetailsSchema>;
export type BungeeTxData = z.infer<typeof BungeeTxDataSchema>;
export type BungeeSignTypedData = z.infer<typeof BungeeSignTypedDataSchema>;
export type BungeeRefuel = z.infer<typeof BungeeRefuelSchema>;
export type BungeeAffiliateFee = z.infer<typeof BungeeAffiliateFeeSchema>;
export type BungeeRewards = z.infer<typeof BungeeRewardsSchema>;
export type BungeeAutoRoute = z.infer<typeof BungeeAutoRouteSchema>;
export type BungeeManualRoute = z.infer<typeof BungeeManualRouteSchema>;
export type BungeeQuoteRequest = z.infer<typeof BungeeQuoteRequestSchema>;
export type BungeeQuoteResult = z.infer<typeof BungeeQuoteResultSchema>;
export type BungeeQuoteResponse = z.infer<typeof BungeeQuoteResponseSchema>;
export type BungeeBuildTxRequest = z.infer<typeof BungeeBuildTxRequestSchema>;
export type BungeeBuildTxResult = z.infer<typeof BungeeBuildTxResultSchema>;
export type BungeeBuildTxResponse = z.infer<typeof BungeeBuildTxResponseSchema>;
export type BungeeSubmitRequest = z.infer<typeof BungeeSubmitRequestSchema>;
export type BungeeSubmitResult = z.infer<typeof BungeeSubmitResultSchema>;
export type BungeeSubmitResponse = z.infer<typeof BungeeSubmitResponseSchema>;
export type BungeeStatusRequest = z.infer<typeof BungeeStatusRequestSchema>;
export type BungeeOriginData = z.infer<typeof BungeeOriginDataSchema>;
export type BungeeDestinationData = z.infer<typeof BungeeDestinationDataSchema>;
export type BungeeStatusResult = z.infer<typeof BungeeStatusResultSchema>;
export type BungeeStatusResponse = z.infer<typeof BungeeStatusResponseSchema>;
export type BungeeTokenListResponse = z.infer<typeof BungeeTokenListResponseSchema>;
