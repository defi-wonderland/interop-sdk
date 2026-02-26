import type { Hex } from "viem";
import type { OrderStatus, SwapQuote, ChainAssets, EIP712Payload } from "../../core/types.js";
import type { OIFQuote, OIFAssetsResponse, OIFOrderStatusResponse } from "./Client.js";
import type { OIFOrderType } from "./types.js";

// ─── Status Mapping ─────────────────────────────────────────────
// Solver status can be a string OR an object (known spec divergence).
// Normalize to SDK OrderStatus.

export function mapOrderStatus(raw: OIFOrderStatusResponse["status"]): OrderStatus {
  throw new Error("Not implemented");
}

export function isTerminalStatus(status: OrderStatus): boolean {
  throw new Error("Not implemented");
}

// ─── Quote Mapping ──────────────────────────────────────────────
// OIFQuote → SwapQuote, setting protocol and submissionType based on order type.

export function mapQuoteToSwapQuote(_quote: OIFQuote, _protocol: string): SwapQuote {
  throw new Error("Not implemented");
}

// Determine order type from the raw quote's order field
export function resolveOrderType(_quote: OIFQuote): OIFOrderType {
  throw new Error("Not implemented");
}

// ─── Asset Mapping ──────────────────────────────────────────────
// OIFAssetsResponse uses { networks: Record<name, { chain_id, assets }> }
// Normalize to ChainAssets[] with camelCase chainId.

export function mapAssetsToChainAssets(_response: OIFAssetsResponse): ChainAssets[] {
  throw new Error("Not implemented");
}

// ─── EIP-712 Normalization ──────────────────────────────────────
// Solver typed data payloads need fixes before wallet signing:
// - domain.chainId: string → number
// - domain.version: add/remove depending on order type
// - types: replace incomplete definitions with canonical types

export function normalizeTypedData(_raw: Record<string, unknown>, _orderType: OIFOrderType): EIP712Payload {
  throw new Error("Not implemented");
}

// ─── Signature Prefixing ────────────────────────────────────────
// OIF spec requires a prefix byte on certain order types before POST /v1/orders.

export function prefixSignature(_signature: Hex, _orderType: OIFOrderType): Hex {
  throw new Error("Not implemented");
}
