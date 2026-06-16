import { z } from "zod";

// ── Common ──────────────────────────────────────────────

/** Token metadata returned across Superbridge responses. */
export const SuperbridgeTokenSchema = z.object({
    address: z.string(),
    chainUid: z.string().optional(),
    chainId: z.string(),
    chainKeys: z.array(z.string()).optional(),
    name: z.string().optional(),
    decimals: z.number().int().nonnegative(),
    symbol: z.string(),
    logoUri: z.string().nullable().optional(),
    usd: z.number().nullable().optional(),
    isSpl2022: z.boolean().optional(),
    verified: z.boolean().optional(),
});

/** EVM initiating/step transaction ready to be sent on-chain. */
export const SuperbridgeEvmTransactionSchema = z.object({
    type: z.literal("evm"),
    chainUid: z.string().optional(),
    chainId: z.string(),
    chainKeys: z.array(z.string()).optional(),
    from: z.string().optional(),
    to: z.string(),
    data: z.string(),
    value: z.string().optional(),
});

/** EVM gasless initiating transaction carrying EIP-712 typed data to sign. */
export const SuperbridgeEvmGaslessTransactionSchema = z.object({
    type: z.literal("evm-gasless"),
    chainUid: z.string().optional(),
    chainId: z.string(),
    chainKeys: z.array(z.string()).optional(),
    typedData: z.string(),
});

/** Initiating transaction variants supported by the SDK (EVM only). */
export const SuperbridgeInitiatingTransactionSchema = z.discriminatedUnion("type", [
    SuperbridgeEvmTransactionSchema,
    SuperbridgeEvmGaslessTransactionSchema,
]);

/** ERC-20 approval (or revoke / gas-token approval) required before bridging. */
export const SuperbridgeTokenApprovalSchema = z.object({
    contractAddress: z.string(),
    tokenAddress: z.string(),
    amount: z.string().optional(),
    tx: SuperbridgeEvmTransactionSchema,
});

/** Display info for the underlying bridge provider of a route. */
export const SuperbridgeProviderInfoSchema = z
    .object({
        name: z.string(),
    })
    .passthrough();

/** A single fee line item. */
export const SuperbridgeFeeItemSchema = z.object({
    name: z.string().optional(),
    amount: z.string(),
    token: SuperbridgeTokenSchema.optional(),
    exclusive: z.boolean().optional(),
    bps: z.number().optional(),
});

/** A group of fee line items belonging to a provider. */
export const SuperbridgeFeeGroupSchema = z.object({
    items: z.array(SuperbridgeFeeItemSchema),
    provider: SuperbridgeProviderInfoSchema.optional(),
});

// ── Routes ──────────────────────────────────────────────

/** Body for the Superbridge POST `/v1/routes` request. */
export const SuperbridgeRoutesRequestSchema = z.object({
    fromChainId: z.string().optional(),
    toChainId: z.string().optional(),
    fromChainKey: z.string().optional(),
    toChainKey: z.string().optional(),
    fromTokenAddress: z.string(),
    toTokenAddress: z.string(),
    sender: z.string().optional(),
    recipient: z.string().optional(),
    amount: z.string(),
    slippage: z.number(),
    routeIds: z.array(z.string()).optional(),
});

/** A step inside a route quote (transaction or wait). Wait steps carry the ETA contribution. */
export const SuperbridgeRouteStepSchema = z
    .object({
        type: z.string().optional(),
        expectedDuration: z.number().optional(),
    })
    .passthrough();

/** A successful quote from a single provider. */
export const SuperbridgeRouteQuoteSchema = z
    .object({
        initiatingTransaction: SuperbridgeInitiatingTransactionSchema,
        tokenApproval: SuperbridgeTokenApprovalSchema.optional(),
        revokeTokenApproval: SuperbridgeTokenApprovalSchema.optional(),
        gasTokenApproval: SuperbridgeTokenApprovalSchema.optional(),
        fees: z.array(SuperbridgeFeeGroupSchema).optional(),
        token: SuperbridgeTokenSchema.optional(),
        receiveToken: SuperbridgeTokenSchema.optional(),
        receive: z.string().optional(),
        steps: z.array(SuperbridgeRouteStepSchema).optional(),
        duration: z.number().optional(),
    })
    .passthrough();

/** Per-route metadata carrying the route id and underlying bridge provider. */
export const SuperbridgeRouteMetaSchema = z
    .object({
        id: z.string().optional(),
        provider: SuperbridgeProviderInfoSchema.optional(),
        secondaryProvider: z.unknown().optional(),
        requiresManualSteps: z.boolean().optional(),
    })
    .passthrough();

/** A non-quote route result variant (`Disabled`, `AmountTooLarge`, `GenericError`, …) carrying a `type` discriminator. */
export const SuperbridgeRouteErrorSchema = z
    .object({
        type: z.string(),
        error: z.string().optional(),
        maximum: z.string().optional(),
        minimum: z.string().optional(),
    })
    .passthrough();

/** One route result: either a quote (with `initiatingTransaction`) or an error variant. */
export const SuperbridgeRouteResultSchema = z.object({
    result: z.union([SuperbridgeRouteQuoteSchema, SuperbridgeRouteErrorSchema]),
    meta: SuperbridgeRouteMetaSchema.optional(),
});

/** Response from the Superbridge POST `/v1/routes` endpoint. */
export const SuperbridgeRoutesResponseSchema = z.object({
    request: z.unknown().optional(),
    results: z.array(SuperbridgeRouteResultSchema),
});

// ── Activity ────────────────────────────────────────────

/** On-chain confirmation details for a completed transaction step. */
export const SuperbridgeConfirmationSchema = z
    .object({
        timestamp: z.number().optional(),
        transactionHash: z.string(),
        status: z.enum(["confirmed", "reverted", "dropped"]).optional(),
    })
    .passthrough();

/** A transaction step within an activity item. */
export const SuperbridgeActivityTransactionStepSchema = z
    .object({
        type: z.literal("transaction"),
        chainUid: z.string().optional(),
        chainId: z.string().optional(),
        chainKeys: z.array(z.string()).optional(),
        action: z.unknown().optional(),
        transactionStatus: z.enum(["done", "ready", "not-ready", "auto", "invalidated"]),
        confirmation: SuperbridgeConfirmationSchema.optional(),
    })
    .passthrough();

/** A wait step within an activity item. */
export const SuperbridgeActivityWaitStepSchema = z
    .object({
        type: z.literal("wait"),
        waitStatus: z.enum(["done", "in-progress", "not-started", "invalidated"]),
        waitType: z.string().optional(),
        startedAt: z.number().optional(),
        expectedDuration: z.number().optional(),
    })
    .passthrough();

/** A protocol upgrade event that can invalidate earlier steps. */
export const SuperbridgeActivityUpgradeEventSchema = z
    .object({
        type: z.literal("upgrade-event"),
    })
    .passthrough();

/** A single step inside an activity item. */
export const SuperbridgeActivityStepSchema = z.discriminatedUnion("type", [
    SuperbridgeActivityTransactionStepSchema,
    SuperbridgeActivityWaitStepSchema,
    SuperbridgeActivityUpgradeEventSchema,
]);

/** A single activity item returned by GET `/v1/activity`. */
export const SuperbridgeActivitySchema = z
    .object({
        id: z.string(),
        type: z.enum(["bridge", "crosschainswap", "swap"]).optional(),
        provider: SuperbridgeProviderInfoSchema.optional(),
        fromChainId: z.string().optional(),
        toChainId: z.string().optional(),
        from: z.string().optional(),
        to: z.string().optional(),
        amount: z.string().optional(),
        receiveAmount: z.string().optional(),
        fromToken: SuperbridgeTokenSchema.optional(),
        toToken: SuperbridgeTokenSchema.optional(),
        steps: z.array(SuperbridgeActivityStepSchema),
        fees: z.array(SuperbridgeFeeGroupSchema).optional(),
        nextCheckTimestamp: z.number().nullable().optional(),
        escapeHatch: z.boolean().optional(),
    })
    .passthrough();

/** Response from the Superbridge GET `/v1/activity` endpoint. */
export const SuperbridgeActivityResponseSchema = z.array(SuperbridgeActivitySchema);

// ── Submit gasless ──────────────────────────────────────

/** Body for the Superbridge POST `/v1/submit_gasless` request. */
export const SuperbridgeSubmitGaslessRequestSchema = z.object({
    typedData: z.string(),
    signature: z.string(),
    id: z.string().optional(),
    chainId: z.string().optional(),
});

/** Response from the Superbridge POST `/v1/submit_gasless` endpoint. */
export const SuperbridgeSubmitGaslessResponseSchema = z
    .object({
        id: z.string().optional(),
        txHash: z.string().optional(),
        status: z.string().optional(),
        message: z.string().optional(),
    })
    .passthrough();

/** EIP-712 typed data parsed from a gasless initiating transaction. */
export const SuperbridgeTypedDataSchema = z.object({
    domain: z.record(z.string(), z.unknown()),
    types: z.record(z.string(), z.array(z.object({ name: z.string(), type: z.string() }))),
    primaryType: z.string(),
    message: z.record(z.string(), z.unknown()),
});

/** Metadata stored on SDK signature steps created from gasless Superbridge routes. */
export const SuperbridgeGaslessStepMetadataSchema = z.object({
    superbridgeTypedData: z.string(),
    superbridgeChainId: z.string().optional(),
    superbridgeRouteId: z.string().optional(),
});

// ── Tokens (discovery) ──────────────────────────────────

/** Response from the Superbridge GET `/v1/tokens` endpoint. Paginated. */
export const SuperbridgeTokensResponseSchema = z.object({
    tokens: z.array(SuperbridgeTokenSchema),
    nextCursor: z.string().nullable().optional(),
});

// ── Types ───────────────────────────────────────────────

export type SuperbridgeToken = z.infer<typeof SuperbridgeTokenSchema>;
export type SuperbridgeEvmTransaction = z.infer<typeof SuperbridgeEvmTransactionSchema>;
export type SuperbridgeEvmGaslessTransaction = z.infer<
    typeof SuperbridgeEvmGaslessTransactionSchema
>;
export type SuperbridgeInitiatingTransaction = z.infer<
    typeof SuperbridgeInitiatingTransactionSchema
>;
export type SuperbridgeTokenApproval = z.infer<typeof SuperbridgeTokenApprovalSchema>;
export type SuperbridgeFeeItem = z.infer<typeof SuperbridgeFeeItemSchema>;
export type SuperbridgeFeeGroup = z.infer<typeof SuperbridgeFeeGroupSchema>;
export type SuperbridgeRoutesRequest = z.infer<typeof SuperbridgeRoutesRequestSchema>;
export type SuperbridgeRouteStep = z.infer<typeof SuperbridgeRouteStepSchema>;
export type SuperbridgeRouteQuote = z.infer<typeof SuperbridgeRouteQuoteSchema>;
export type SuperbridgeRouteMeta = z.infer<typeof SuperbridgeRouteMetaSchema>;
export type SuperbridgeRouteError = z.infer<typeof SuperbridgeRouteErrorSchema>;
export type SuperbridgeRouteResult = z.infer<typeof SuperbridgeRouteResultSchema>;
export type SuperbridgeRoutesResponse = z.infer<typeof SuperbridgeRoutesResponseSchema>;
export type SuperbridgeActivityStep = z.infer<typeof SuperbridgeActivityStepSchema>;
export type SuperbridgeActivity = z.infer<typeof SuperbridgeActivitySchema>;
export type SuperbridgeActivityResponse = z.infer<typeof SuperbridgeActivityResponseSchema>;
export type SuperbridgeSubmitGaslessRequest = z.infer<typeof SuperbridgeSubmitGaslessRequestSchema>;
export type SuperbridgeSubmitGaslessResponse = z.infer<
    typeof SuperbridgeSubmitGaslessResponseSchema
>;
export type SuperbridgeTokensResponse = z.infer<typeof SuperbridgeTokensResponseSchema>;
export type SuperbridgeTypedData = z.infer<typeof SuperbridgeTypedDataSchema>;
export type SuperbridgeGaslessStepMetadata = z.infer<typeof SuperbridgeGaslessStepMetadataSchema>;
