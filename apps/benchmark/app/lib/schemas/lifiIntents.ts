import { z } from 'zod';

export const LifiIntentsOrderOutputSchema = z.object({ token: z.string() }).passthrough();

// `inputs` is `[[lifiTokenId, amount], ...]`; the token id is a decimal string
// encoding of the EVM address, the amount is raw base units. Extra tuple
// elements are tolerated via `.rest`.
export const LifiIntentsOrderInputSchema = z.tuple([z.string(), z.string()]).rest(z.unknown());

export const LifiIntentsOrderDetailsSchema = z
  .object({
    outputs: z.array(LifiIntentsOrderOutputSchema),
    inputs: z.array(LifiIntentsOrderInputSchema).optional(),
  })
  .passthrough();

// order.li.fi returns raw token amounts only — `inputAmount`/`outputAmount` are
// base-unit strings. We price them with DeFiLlama to derive USD fee/volume.
export const LifiIntentsQuoteSchema = z
  .object({
    inputAmount: z.string().optional(),
    outputAmount: z.string().optional(),
  })
  .passthrough()
  .nullable()
  .optional();

// `orderStatus` is left as a free-form string: the Order Server may add new states
// (e.g. Signed, Delivered, Verified). normalizeStatus handles unknown values explicitly.
export const LifiIntentsOrderMetaSchema = z
  .object({
    orderStatus: z.string(),
    submitTime: z.number(),
    signedAt: z.string().nullable().optional(),
    deliveredAt: z.string().nullable().optional(),
    settledAt: z.string().nullable().optional(),
    expiredAt: z.string().nullable().optional(),
    refundedAt: z.string().nullable().optional(),
    orderInitiatedTxHash: z.string().nullable().optional(),
    orderDeliveredTxHash: z.string().nullable().optional(),
    orderSettledTxHash: z.string().nullable().optional(),
  })
  .passthrough();

export const LifiIntentsOrderItemSchema = z
  .object({
    order: LifiIntentsOrderDetailsSchema,
    quote: LifiIntentsQuoteSchema,
    meta: LifiIntentsOrderMetaSchema,
  })
  .passthrough();

export const LifiIntentsOrdersResponseSchema = z.object({
  data: z.array(LifiIntentsOrderItemSchema),
  meta: z
    .object({
      total: z.number(),
      limit: z.number(),
      offset: z.number(),
    })
    .passthrough()
    .optional(),
});

export type LifiIntentsOrderItem = z.infer<typeof LifiIntentsOrderItemSchema>;
export type LifiIntentsOrderMeta = z.infer<typeof LifiIntentsOrderMetaSchema>;
export type LifiIntentsOrdersResponse = z.infer<typeof LifiIntentsOrdersResponseSchema>;
