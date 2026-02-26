import type { Address, Hex } from "viem";

// ─── Token & Amount ─────────────────────────────────────────────

export interface TokenAmount {
  chainId: number;
  token: Address;
  amount: bigint;
}

// ─── Quote Request & Response ───────────────────────────────────

export interface SwapQuoteRequest {
  sender: Address;
  input: { chainId: number; token: Address; amount: bigint };
  output: { chainId: number; token: Address; minAmount?: bigint };
  recipient?: Address;
}

export interface SwapQuote {
  quoteId: string;
  protocol: string;
  input: TokenAmount;
  output: TokenAmount;
  /**
   * Transactions the user must send before the main action.
   * - Permit2/EIP-3009: usually empty (the signature IS the authorization).
   *   May include a one-time Permit2 contract approval for new tokens.
   * - User-open: ERC20 approve to the settlement contract.
   */
  approvals: TransactionRequest[];
  /**
   * The main wallet action.
   * - "signature": user signs EIP-712 typed data, no on-chain tx needed.
   * - "transaction": user sends a transaction directly.
   */
  preparedOrder: PreparedOrder;
  estimatedTimeMs?: number;
  expiresAt?: number;
  metadata?: Record<string, unknown>;
}

// ─── Quote Sorting ──────────────────────────────────────────────

export type SortStrategy = "best-output" | "lowest-eta";

// ─── Order Preparation ──────────────────────────────────────────

export interface TransactionRequest {
  to: Address;
  data: Hex;
  value?: bigint;
  chainId: number;
}

export interface EIP712Payload {
  domain: Record<string, unknown>;
  types: Record<string, unknown>;
  primaryType: string;
  message: Record<string, unknown>;
}

export type PreparedOrder =
  | { type: "transaction"; transaction: TransactionRequest }
  | { type: "signature"; scheme: "permit2" | "eip-3009"; signPayload: EIP712Payload };

// ─── Submission ─────────────────────────────────────────────────
// The user handles wallet interactions, then hands back the raw Hex result.
// For "signature" orders: the EIP-712 signature.
// For "transaction" orders: the txHash.
// The adapter knows which one from quote.preparedOrder.type.

// ─── Order Tracking ─────────────────────────────────────────────

export interface OrderReference {
  protocol: string;
  orderId: string;
  originChainId: number;
  destinationChainId: number;
  txHash?: Hex;
}

export type OrderStatus = "pending" | "filling" | "filled" | "failed" | "expired" | "refunded";

export interface OrderStatusUpdate {
  status: OrderStatus;
  timestamp: number;
  fillTxHash?: Hex;
  message?: string;
}

// ─── Asset Discovery ────────────────────────────────────────────

export interface Asset {
  address: Address;
  symbol: string;
  decimals: number;
  chainId: number;
}

export interface ChainAssets {
  chainId: number;
  assets: Asset[];
}

// ─── Adapter Plugin Interface ───────────────────────────────────

export interface SwapAdapter {
  readonly protocol: string;

  // Discovery
  getSupportedAssets(): Promise<ChainAssets[]>;
  getSupportedChains(): Promise<number[]>;

  // Quoting
  getQuotes(req: SwapQuoteRequest): Promise<SwapQuote[]>;
  validateQuote(req: SwapQuoteRequest, quote: SwapQuote): Promise<boolean>;

  // Submission
  submit(quote: SwapQuote, result: Hex): Promise<OrderReference>;

  // Tracking
  getOrderStatus(ref: OrderReference): Promise<OrderStatusUpdate>;
  trackOrder(ref: OrderReference): AsyncGenerator<OrderStatusUpdate>;
}
