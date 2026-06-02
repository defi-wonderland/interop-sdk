import { z } from 'zod';
import { HashSchema } from './primitives';

export const RelayRequestStatusSchema = z.enum(['success', 'failure', 'refund', 'pending', 'depositing', 'waiting']);

export const RelayTxStatusSchema = z.enum(['success', 'failure']);

export const RelayFailReasonSchema = z.enum([
  'N/A',
  'UNKNOWN',
  'SLIPPAGE',
  'AMOUNT_TOO_LOW_TO_REFUND',
  'DEPOSIT_ADDRESS_MISMATCH',
  'DEPOSIT_CHAIN_MISMATCH',
  'INCORRECT_DEPOSIT_CURRENCY',
  'DOUBLE_SPEND',
  'SOLVER_CAPACITY_EXCEEDED',
  'SOLVER_BALANCE_TOO_LOW',
  'DEPOSITED_AMOUNT_TOO_LOW_TO_FILL',
  'NEGATIVE_NEW_AMOUNT_AFTER_FEES',
  'NO_QUOTES',
  'MISSING_REVERT_DATA',
  'REVERSE_SWAP_FAILED',
  'GENERATE_SWAP_FAILED',
  'TOO_LITTLE_RECEIVED',
  'EXECUTION_REVERTED',
  'NEW_CALLDATA_INCLUDES_HIGHER_RENT_FEE',
  'TRANSACTION_REVERTED',
  'TRANSACTION_TOO_LARGE',
  'ORIGIN_CURRENCY_MISMATCH',
  'NO_INTERNAL_SWAP_ROUTES_FOUND',
  'SWAP_USES_TOO_MUCH_GAS',
  'INSUFFICIENT_FUNDS_FOR_RENT',
  'SPONSOR_BALANCE_TOO_LOW',
  'ORDER_EXPIRED',
  'ORDER_IS_CANCELLED',
  'TRANSFER_FROM_FAILED',
  'TRANSFER_FAILED',
  'SIGNATURE_EXPIRED',
  'INVALID_SIGNATURE',
  'INSUFFICIENT_NATIVE_TOKENS_SUPPLIED',
  'TRANSFER_AMOUNT_EXCEEDS_ALLOWANCE',
  'TRANSFER_AMOUNT_EXCEEDS_BALANCE',
  'INVALID_SENDER',
  'ACCOUNT_ABSTRACTION_INVALID_NONCE',
  'ACCOUNT_ABSTRACTION_SIGNATURE_ERROR',
  'SEAPORT_INEXACT_FRACTION',
  'TOKEN_NOT_TRANSFERABLE',
  'ZERO_SELL_AMOUNT',
  'MINT_NOT_ACTIVE',
  'ERC_1155_TOO_MANY_REQUESTED',
  'INCORRECT_PAYMENT',
  'INVALID_GAS_PRICE',
  'FLUID_DEX_ERROR',
  'ORDER_ALREADY_FILLED',
  'SEAPORT_INVALID_FULFILLER',
  'INVALID_SIGNER',
  'MINT_QUANTITY_EXCEEDS_MAX_PER_WALLET',
  'MINT_QUANTITY_EXCEEDS_MAX_SUPPLY',
  'JUPITER_INVALID_TOKEN_ACCOUNT',
  'INVALID_NONCE',
  'ACCOUNT_ABSTRACTION_GAS_LIMIT',
  'CONTRACT_PAUSED',
  'SWAP_IMPACT_TOO_HIGH',
  'INSUFFICIENT_POOL_LIQUIDITY',
  'TTL_EXPIRED',
]);

export const RelayRefundFailReasonSchema = z.enum([
  'N/A',
  'AMOUNT_TOO_LOW_TO_REFUND',
  'NEGATIVE_NEW_AMOUNT_AFTER_FEES',
  'SWAP_CURRENCY_NOT_ON_ORIGIN',
]);

export const RelayTxSchema = z.object({
  hash: HashSchema.optional(),
  chainId: z.number(),
  block: z.number().optional(),
  timestamp: z.number().optional(),
  status: RelayTxStatusSchema.optional(),
  type: z.literal('onchain').optional(),
  fee: z.string().optional(),
  data: z.unknown().optional(),
  stateChanges: z.array(z.unknown()).optional(),
});

export const RelayFeesSchema = z.object({
  gas: z.string().optional(),
  fixed: z.string().optional(),
  price: z.string().optional(),
  gateway: z.string().optional(),
});

export const RelayFeesUsdSchema = RelayFeesSchema;

export const RelayCurrencyMetadataSchema = z.object({
  logoURI: z.string().optional(),
  verified: z.boolean().optional(),
  isNative: z.boolean().optional(),
});

// `address` is the token contract address. Relay supports cross-VM (Solana/Bitcoin) so we keep
// it as `string` — only EVM tokens are guaranteed to parse with viem's Address.
export const RelayCurrencySchema = z.object({
  chainId: z.number(),
  address: z.string(),
  symbol: z.string(),
  name: z.string(),
  decimals: z.number().int(),
  metadata: RelayCurrencyMetadataSchema,
});

export const RelayCurrencyAmountSchema = z.object({
  currency: RelayCurrencySchema,
  amount: z.string(),
  amountFormatted: z.string(),
  amountUsd: z.string(),
  amountUsdCurrent: z.string().optional(),
  minimumAmount: z.string(),
});

export const RelayRouteEdgeSchema = z.object({
  router: z.string().optional(),
  includedSwapSources: z.array(z.string()).optional(),
});

export const RelayRouteSchema = z.object({
  origin: RelayRouteEdgeSchema.extend({ inputCurrency: RelayCurrencyAmountSchema.optional() }),
  destination: RelayRouteEdgeSchema,
});

export const RelayMetadataSchema = z.object({
  sender: z.string().optional(),
  recipient: z.string().optional(),
  currencyIn: RelayCurrencyAmountSchema.optional(),
  currencyOut: RelayCurrencyAmountSchema.optional(),
  rate: z.string().optional(),
  route: RelayRouteSchema.optional(),
});

export const RelayAppFeeSchema = z.object({
  recipient: z.string(),
  bps: z.string(),
  amount: z.string(),
  amountUsd: z.string(),
  amountUsdCurrent: z.string(),
});

export const RelayRequestDataSchema = z.object({
  subsidizedRequest: z.boolean(),
  slippageTolerance: z.string().optional(),
  failReason: RelayFailReasonSchema,
  refundFailReason: RelayRefundFailReasonSchema,
  failedTxHash: HashSchema.optional(),
  failedTxBlockNumber: z.number().optional(),
  failedCallData: z.unknown().optional(),
  fees: RelayFeesSchema,
  feesUsd: RelayFeesUsdSchema.optional(),
  inTxs: z.array(RelayTxSchema),
  outTxs: z.array(RelayTxSchema),
  currency: z.string(),
  currencyObject: RelayCurrencySchema.partial(),
  feeCurrency: z.string(),
  feeCurrencyObject: RelayCurrencySchema,
  appFeeCurrencyObject: RelayCurrencySchema.optional(),
  appFees: z.array(RelayAppFeeSchema),
  paidAppFees: z.array(RelayAppFeeSchema),
  refundCurrencyData: RelayCurrencyAmountSchema.optional(),
  subsidizedFee: z.unknown().optional(),
  feeSponsorship: z.unknown().optional(),
  expandedPriceImpact: z.unknown().nullable().optional(),
  metadata: RelayMetadataSchema,
  price: z.string(),
  usesExternalLiquidity: z.boolean(),
  timeEstimate: z.number(),
});

export const RelayDepositAddressSchema = z.object({
  address: z.string(),
  depositAddressType: z.enum(['strict', 'open']),
  depositor: z.string().nullable(),
});

export const RelayProtocolDepositOriginSchema = z.object({
  amount: z.string(),
  chainId: z.number(),
  currency: z.string(),
  depositor: z.string(),
  depository: z.string(),
  onchainId: z.string(),
  transactionId: z.string(),
});

export const RelayProtocolSolverSchema = z.object({
  address: z.string(),
  protocolChainId: z.string(),
  chainId: z.number(),
});

export const RelayProtocolSchema = z.object({
  orderId: z.string(),
  hubType: z.string(),
  isWithdrawable: z.boolean(),
  solver: RelayProtocolSolverSchema,
  deposit: z.object({ origin: RelayProtocolDepositOriginSchema }),
});

export const RelayRequestSchema = z.object({
  id: z.string(),
  status: RelayRequestStatusSchema,
  user: z.string(),
  recipient: z.string(),
  depositAddress: RelayDepositAddressSchema.nullable().optional(),
  data: RelayRequestDataSchema,
  protocol: RelayProtocolSchema.optional(),
  moonpayId: z.string().optional(),
  referrer: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const RelayResponseSchema = z.object({
  requests: z.array(RelayRequestSchema),
  continuation: z.string().optional(),
});

export const RelayRequestsQuerySchema = z.object({
  limit: z.number().int().min(1).max(50).optional(),
  continuation: z.string().optional(),
  user: z.string().optional(),
  hash: z.string().optional(),
  originChainId: z.number().int().optional(),
  destinationChainId: z.number().int().optional(),
  chainId: z.string().optional(),
  id: z.string().optional(),
  orderId: z.string().optional(),
  depositAddress: z.string().optional(),
  referrer: z.string().optional(),
  apiKey: z.string().optional(),
  privateChainsToInclude: z.string().optional(),
  startTimestamp: z.number().int().optional(),
  endTimestamp: z.number().int().optional(),
  startBlock: z.number().int().optional(),
  endBlock: z.number().int().optional(),
  includeOrderData: z.boolean().optional(),
  includeChildRequests: z.boolean().optional(),
  status: RelayRequestStatusSchema.optional(),
  sortBy: z.enum(['createdAt', 'updatedAt']).optional(),
  sortDirection: z.enum(['asc', 'desc']).optional(),
});

const RelayHistoryTxSchema = z.object({ timestamp: z.number().optional() }).passthrough();

const RelayHistoryCurrencyAmountSchema = z
  .object({
    amountUsd: z.string().optional(),
    currency: z.object({ address: z.string() }).passthrough().optional(),
  })
  .passthrough();

const RelayHistoryMetadataSchema = z.object({ currencyIn: RelayHistoryCurrencyAmountSchema.optional() }).passthrough();

const RelayHistoryFeesUsdSchema = RelayFeesUsdSchema.passthrough();

export const RelayHistoryRequestDataSchema = z
  .object({
    subsidizedRequest: z.boolean().optional(),
    inTxs: z.array(RelayHistoryTxSchema).optional(),
    outTxs: z.array(RelayHistoryTxSchema).optional(),
    metadata: RelayHistoryMetadataSchema.optional(),
    feesUsd: RelayHistoryFeesUsdSchema.optional(),
  })
  .passthrough();

export const RelayHistoryRequestSchema = z
  .object({
    status: RelayRequestStatusSchema,
    createdAt: z.string(),
    data: RelayHistoryRequestDataSchema,
  })
  .passthrough();

export const RelayHistoryResponseSchema = z.object({
  requests: z.array(RelayHistoryRequestSchema),
  continuation: z.string().optional(),
});

export type RelayRequest = z.infer<typeof RelayRequestSchema>;
export type RelayResponse = z.infer<typeof RelayResponseSchema>;
export type RelayRequestStatus = z.infer<typeof RelayRequestStatusSchema>;
export type RelayTx = z.infer<typeof RelayTxSchema>;
export type RelayFees = z.infer<typeof RelayFeesSchema>;
export type RelayFeesUsd = z.infer<typeof RelayFeesUsdSchema>;
export type RelayMetadata = z.infer<typeof RelayMetadataSchema>;
export type RelayRequestData = z.infer<typeof RelayRequestDataSchema>;
export type RelayCurrency = z.infer<typeof RelayCurrencySchema>;
export type RelayCurrencyAmount = z.infer<typeof RelayCurrencyAmountSchema>;
export type RelayRequestsQuery = z.input<typeof RelayRequestsQuerySchema>;
export type RelayHistoryRequest = z.infer<typeof RelayHistoryRequestSchema>;
export type RelayHistoryResponse = z.infer<typeof RelayHistoryResponseSchema>;
export type RelayHistoryFeesUsd = z.infer<typeof RelayHistoryFeesUsdSchema>;
