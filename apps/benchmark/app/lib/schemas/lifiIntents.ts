import { z } from 'zod';

export const LifiIntentsOrderOutputSchema = z.object({ token: z.string() }).passthrough();

export const LifiIntentsOrderDetailsSchema = z.object({ outputs: z.array(LifiIntentsOrderOutputSchema) }).passthrough();

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
    .passthrough(),
});

export type LifiIntentsOrderItem = z.infer<typeof LifiIntentsOrderItemSchema>;
export type LifiIntentsOrderMeta = z.infer<typeof LifiIntentsOrderMetaSchema>;
export type LifiIntentsOrdersResponse = z.infer<typeof LifiIntentsOrdersResponseSchema>;
