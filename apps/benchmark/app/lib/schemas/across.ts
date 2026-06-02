import { z } from 'zod';
import { AddressSchema, HashSchema, HexSchema } from './primitives';

export const AcrossDepositStatusSchema = z.enum([
  'unfilled',
  'filled',
  'slowFillRequested',
  'slowFilled',
  'expired',
  'refunded',
]);

export const AcrossDepositSchema = z.object({
  id: z.number().int(),
  relayHash: HashSchema.nullable(),
  depositId: z.string().nullable(),
  originChainId: z.number().int(),
  destinationChainId: z.number().int(),
  depositor: AddressSchema,
  recipient: AddressSchema,
  inputToken: AddressSchema,
  inputAmount: z.string(),
  outputToken: AddressSchema,
  outputAmount: z.string(),
  swapOutputToken: AddressSchema.nullable(),
  swapOutputTokenAmount: z.string().nullable(),
  swapToken: AddressSchema.nullable(),
  swapTokenAmount: z.string().nullable(),
  swapTokenPriceUsd: z.string().nullable(),
  swapTransactionHash: HashSchema.nullable(),
  message: HexSchema,
  messageHash: HashSchema.nullable(),
  exclusiveRelayer: AddressSchema,
  exclusivityDeadline: z.string().nullable(),
  fillDeadline: z.string().nullable(),
  quoteTimestamp: z.string(),
  depositTxHash: HashSchema,
  depositTxnRef: HashSchema,
  depositBlockNumber: z.number().int(),
  depositBlockTimestamp: z.string(),
  status: AcrossDepositStatusSchema,
  depositRefundTxHash: HashSchema.nullable(),
  depositRefundTxnRef: HashSchema.nullable(),
  bridgeFeeUsd: z.string().nullable(),
  swapFeeUsd: z.string().nullable(),
  inputPriceUsd: z.string().nullable(),
  outputPriceUsd: z.string().nullable(),
  fillGasFee: z.string().nullable(),
  fillGasFeeUsd: z.string().nullable(),
  fillGasTokenPriceUsd: z.string().nullable(),
  actionsSucceeded: z.boolean().nullable(),
  actionsTargetChainId: z.number().int().nullable(),
  relayer: AddressSchema.nullable(),
  fillBlockNumber: z.number().int().nullable(),
  fillBlockTimestamp: z.string().nullable(),
  fillTx: HashSchema.nullable(),
  fillTxnRef: HashSchema.nullable(),
  speedups: z.array(z.unknown()).default([]),
});

export const AcrossDepositsResponseSchema = z.array(AcrossDepositSchema);

export const AcrossHistoryDepositSchema = z
  .object({
    status: AcrossDepositStatusSchema,
    originChainId: z.number().int(),
    inputToken: z.string(),
    inputAmount: z.string(),
    depositBlockTimestamp: z.string(),
    inputPriceUsd: z.string().nullable().optional(),
    bridgeFeeUsd: z.string().nullable().optional(),
    fillGasFeeUsd: z.string().nullable().optional(),
    swapFeeUsd: z.string().nullable().optional(),
    fillBlockTimestamp: z.string().nullable().optional(),
  })
  .passthrough();

export const AcrossHistoryDepositsResponseSchema = z.array(AcrossHistoryDepositSchema);

export const AcrossDepositsQuerySchema = z.object({
  limit: z.number().int().min(1).max(100).optional(),
  skip: z.number().int().min(0).optional(),
  status: AcrossDepositStatusSchema.optional(),
  originChainId: z.number().int().optional(),
  destinationChainId: z.number().int().optional(),
  depositor: AddressSchema.optional(),
  recipient: AddressSchema.optional(),
  address: AddressSchema.optional(),
  tokenAddress: AddressSchema.optional(),
  startDepositDate: z.string().optional(),
  endDepositDate: z.string().optional(),
});

export type AcrossDeposit = z.infer<typeof AcrossDepositSchema>;
export type AcrossDepositsResponse = z.infer<typeof AcrossDepositsResponseSchema>;
export type AcrossDepositsQuery = z.input<typeof AcrossDepositsQuerySchema>;
export type AcrossDepositStatus = z.infer<typeof AcrossDepositStatusSchema>;
export type AcrossHistoryDeposit = z.infer<typeof AcrossHistoryDepositSchema>;
export type AcrossHistoryDepositsResponse = z.infer<typeof AcrossHistoryDepositsResponseSchema>;
