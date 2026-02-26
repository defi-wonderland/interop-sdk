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

export class UserOpenAdapter implements SwapAdapter {
  readonly protocol = "oif-user-open";
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

  // Client.getQuotes() → filter by USER_OPEN_ORDER_TYPES → mapQuoteToSwapQuote()
  // + use quote.preparedTransaction from solver → preparedOrder { type: "transaction" }
  // approvals: ERC20 approve to settlement contract (from solver's checks.allowances)
  async getQuotes(_req: SwapQuoteRequest): Promise<SwapQuote[]> {
    throw new Error("Not implemented");
  }

  // Verify amounts, tokens, chains, and expiry against the original request
  async validateQuote(_req: SwapQuoteRequest, _quote: SwapQuote): Promise<boolean> {
    throw new Error("Not implemented");
  }

  // ─── Submission ─────────────────────────────────────────────

  // result is the txHash from wallet.sendTransaction()
  // Client.postOrder(result) → return OrderReference
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
