import type { Hex } from "viem";
import type {
  ChainAssets,
  OrderReference,
  OrderStatusUpdate,
  SwapAdapter,
  SwapQuote,
  SwapQuoteRequest,
} from "../../../core/types.js";
import type { Client } from "../Client.js";

export class EscrowAdapter implements SwapAdapter {
  readonly protocol = "oif-escrow";
  private client: Client;

  constructor(client: Client) {
    this.client = client;
  }

  // ─── Discovery ──────────────────────────────────────────────

  // Client.getAssets() → mapAssetsToChainAssets()
  async getSupportedAssets(): Promise<ChainAssets[]> {
    throw new Error("Not implemented");
  }

  // Derived from getSupportedAssets() → extract unique chainIds
  async getSupportedChains(): Promise<number[]> {
    throw new Error("Not implemented");
  }

  // ─── Quoting ────────────────────────────────────────────────

  // Client.getQuotes() → filter by ESCROW_ORDER_TYPES → mapQuoteToSwapQuote()
  // + resolveOrderType() → normalizeTypedData() → preparedOrder { type: "signature", scheme }
  // approvals: usually empty (Permit2/EIP-3009 signature IS the authorization)
  //   may include one-time Permit2 contract approval if token not yet approved
  async getQuotes(_req: SwapQuoteRequest): Promise<SwapQuote[]> {
    throw new Error("Not implemented");
  }

  // Verify amounts, tokens, chains, and expiry against the original request
  async validateQuote(_req: SwapQuoteRequest, _quote: SwapQuote): Promise<boolean> {
    throw new Error("Not implemented");
  }

  // ─── Submission ─────────────────────────────────────────────

  // result is the EIP-712 signature from the user's wallet
  // prefixSignature(result, scheme) → Client.postOrder() → return OrderReference
  // No user transaction — the solver/protocol handles on-chain settlement
  async submit(_quote: SwapQuote, _result: Hex): Promise<OrderReference> {
    throw new Error("Not implemented");
  }

  // ─── Tracking ───────────────────────────────────────────────

  // Client.getOrder() → mapOrderStatus() (single call)
  async getOrderStatus(_ref: OrderReference): Promise<OrderStatusUpdate> {
    throw new Error("Not implemented");
  }

  // Poll Client.getOrder() → mapOrderStatus() → yield until isTerminalStatus()
  async *trackOrder(_ref: OrderReference): AsyncGenerator<OrderStatusUpdate> {
    throw new Error("Not implemented");
  }
}
