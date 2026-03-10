/**
 * Adapters for non-spec-compliant solvers (TEMPORARY)
 *
 * Remove when solvers align with oif-specs:
 * - #34, #109: postOrderAdapter
 * - #111: orderStatusAdapter
 * - #286: typedDataAdapter
 */
export * from "./orderStatusAdapter.js";
export * from "./postOrderAdapter.js";
export * from "./signaturePrefixAdapter.js";
export * from "./typedDataAdapter.js";

/**
 * SDK type adapters — convert between SDK-friendly types and OIF wire format
 */
export * from "./quoteRequestAdapter.js";
export * from "./orderAdapter.js";
export * from "./quoteAdapter.js";
export * from "./buildQuoteAdapter.js";
