/**
 * Zod schemas for validating OIF Solver API responses.
 *
 * Validate at the boundary (Client → adapters) so adapters can trust the shapes.
 * Each schema matches the corresponding response type in Client.ts.
 */

// TODO: quoteResponseSchema — validates OIFQuoteResponse (quotes array, order union, preview)
// TODO: postOrderResponseSchema — validates OIFPostOrderResponse (orderId, status)
// TODO: orderStatusResponseSchema — validates OIFOrderStatusResponse (status string|object, timestamps)
// TODO: assetsResponseSchema — validates OIFAssetsResponse (networks record, chain_id, assets array)

// TODO: orderSchema — discriminated union over OIF_ORDER_TYPES
// TODO: eip712TypesSchema — validates EIP-712 type definitions from typed data payloads
