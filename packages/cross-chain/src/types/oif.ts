///////////////////////////////////////////////////////////////////
// TODO: REMOVE THIS FILE WHEN OIF-SPECS IS UPDATED WITH SCHEMAS //
///////////////////////////////////////////////////////////////////

/**
 * OIF API TypeScript Type Definitions
 * This file contains all type definitions used in the OIF protocol
 */

// ============ Common Types ============

/**
 * EIP-7930 interoperable address format
 * @description Cross-chain compatible address format per EIP-7930 version 1 encoded format (0x0001 + chain ID + address) for
 *              unambiguous cross-chain identification.
 * @pattern ^0x0001[a-fA-F0-9]+$
 * @example Cross-chain (Ethereum mainnet): "0x00010000010114D8DA6BF26964AF9D7EED9E03E53415D37AA96045"
 * @example Cross-chain (Polygon): "0x0001000001890314D8DA6BF26964AF9D7EED9E03E53415D37AA96045"
 * @see https://eips.ethereum.org/EIPS/eip-7930
 */
export type Address = string;

/**
 * Token amount as string-encoded integer
 * @description Token amounts are encoded as decimal strings to preserve precision for large integers
 *              (e.g., uint256). Always represents the smallest unit of the token (wei for ETH,
 *              satoshi for BTC, etc.). No decimals or scientific notation allowed.
 * @pattern ^[0-9]+$
 * @example "1000000000000000000" - 1 ETH (18 decimals)
 * @example "1000000" - 1 USDC (6 decimals)
 * @example "100000000" - 1 BTC (8 decimals)
 * @example "0" - Zero amount
 */
export type Amount = string;

/**
 * Order interpretation for quote requests
 * @description Defines which amount is fixed in a quote request when one amount is undefined.
 *              - "exact-input": User specifies exact input amount, provider quotes the output amount
 *              - "exact-output": User specifies exact output amount, provider quotes the input amount needed
 * @example "exact-input" - User has exactly 4000 USDC to swap, wants quote for how much ETH they'll receive
 * @example "exact-output" - User wants exactly 2 ETH, wants quote for how much USDC they need to provide
 * @default "exact-input"
 * @note Only relevant for quote requests. Direct intent submissions include both amounts.
 */
export type SwapType = "exact-input" | "exact-output";

/**
 * Reference to a lock in a locking system
 * @description Specifies the locking mechanism used to secure assets during cross-chain transfers.
 *              Different lock types offer various security guarantees and features.
 */
export interface AssetLockReference {
    /**
     * Lock type identifier
     * @description The locking protocol to use for securing assets
     * - "the-compact": The Compact protocol for efficient cross-chain transfers
     * - "rhinestone": Rhinestone modular account abstraction framework
     */
    kind: "the-compact" | "rhinestone";
    /**
     * Lock-specific parameters
     * @description Additional configuration parameters specific to the chosen lock type
     * @example For "the-compact": { "nonce": "123", "expiry": 1234567890 }
     * @example For "rhinestone": { "module": "0xabc...", "data": "0x123..." }
     */
    params?: Record<string, unknown>;
}

/**
 * Origin submission preference
 * @description Specifies who submits the origin transaction and which authorization schemes are acceptable.
 *              This allows flexible gas payment and signature management across different protocols.
 */
export interface OriginSubmission {
    /**
     * Who submits the origin transaction
     * @description Determines transaction submission responsibility
     * - "user": User directly submits and pays gas
     * - "protocol": Protocol/relayer submits on user's behalf (gasless for user)
     */
    mode: "user" | "protocol";
    /**
     * Acceptable signing/authorization schemes for interoperability
     * @description List of supported authorization methods for the transaction
     * - "erc-4337": Account abstraction (smart contract wallets)
     * - "permit2": Uniswap's Permit2 for token approvals
     * - "erc20-permit": EIP-2612 permit for gasless approvals
     * - "eip-3009": Transfer with authorization (e.g., USDC)
     * @example ["permit2", "erc20-permit"] - Accept either Permit2 or ERC20 permit
     */
    schemes?: Array<"erc-4337" | "permit2" | "erc20-permit" | "eip-3009">;
}

// ============ Quote Types ============

/**
 * Available input from a user
 * @description Specifies assets that a user is willing to provide as input for a swap or transfer.
 *              Represents the "from" side of the transaction.
 * @example Exact-input quote (user has 4000 USDC):
 * {
 *   user: "0x00010000010114D8DA6BF26964AF9D7EED9E03E53415D37AA96045", // Ethereum mainnet
 *   asset: "0x000100000101A0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", // USDC on Ethereum
 *   amount: "4000000000", // Exactly 4000 USDC
 *   lock: { kind: "the-compact" }
 * }
 * @example Exact-output quote (amount undefined, will be quoted):
 * {
 *   user: "0x00010000010114D8DA6BF26964AF9D7EED9E03E53415D37AA96045",
 *   asset: "0x000100000101A0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", // USDC
 *   amount: undefined, // Provider will quote how much USDC needed
 *   lock: { kind: "the-compact" }
 * }
 */
export interface Input {
    /**
     * User address
     * @description The address providing the input assets
     */
    user: Address;
    /**
     * Asset address
     * @description The token/asset being provided as input
     */
    asset: Address;
    /**
     * Amount available
     * @description For quote requests:
     *              - exact-input: The exact amount user will provide
     *              - exact-output: minimum amount user will provide. Optional in request for open discovery of the quote
     *              For direct intents: Always specified
     * @example "4000000000" - 4000 USDC for exact-input quote
     */
    amount?: Amount;
    /**
     * Optional lock reference
     * @description Locking mechanism to use for securing the input assets
     */
    lock?: AssetLockReference;
}

/**
 * Requested output for a receiver
 * @description Specifies the desired assets and destination for a swap or transfer.
 *              Represents the "to" side of the transaction.
 * @example Exact-input quote (amount undefined, will be quoted):
 * {
 *   receiver: "0x000100000101742d35Cc6634C0532925a3b844Bc9e7595f0bEb8",
 *   asset: "0x000100000101dAC17F958D2ee523a2206206994597C13D831ec7", // USDT on Ethereum
 *   amount: undefined, // Provider will quote how much USDT user receives
 *   calldata: "0x095ea7b3..."
 * }
 * @example Exact-output quote (user wants exactly 4000 USDT):
 * {
 *   receiver: "0x000100000101742d35Cc6634C0532925a3b844Bc9e7595f0bEb8",
 *   asset: "0x000100000101dAC17F958D2ee523a2206206994597C13D831ec7", // USDT
 *   amount: "4000000000", // Exactly 4000 USDT requested
 *   calldata: null
 * }
 */
export interface Output {
    /**
     * Receiver address
     * @description The address that will receive the output assets
     */
    receiver: Address;
    /**
     * Asset address
     * @description The token/asset to be received as output
     */
    asset: Address;
    /**
     * Amount requested
     * @description For quote requests:
     *              - exact-input: minimum amount user wants to receive. Optional in request for open discovery of the quote
     *              - exact-output: The exact amount user wants to receive
     *              For direct intents: Always specified
     * @example "2000000000000000000" - 2 ETH for exact-output quote
     */
    amount?: Amount;
    /**
     * Optional calldata describing how the receiver will consume the output
     * @description Encoded function call to be executed when delivering the output,
     *              enabling composability with other protocols
     * @example "0x095ea7b3..." - Approve tokens for another contract
     */
    calldata?: string;
}

/**
 * Quote preview amounts
 * @description Informational amounts for UX/display. These values are not authoritative and
 *              MUST be verified against the signed `order` before execution.
 */
export interface QuotePreview {
    /** Inputs for the preview */
    inputs: Input[];
    /** Outputs for the preview */
    outputs: Output[];
}

/**
 * Quote preference type
 * @description Indicates user's priority when selecting between multiple quotes
 * - "price": Optimize for best exchange rate/lowest cost
 * - "speed": Optimize for fastest execution time
 * - "input-priority": Prefer quotes that use inputs in the order specified
 * - "trust-minimization": Prefer quotes with strongest security guarantees
 * @example "price" - User wants the best exchange rate regardless of speed
 * @example "speed" - User needs immediate execution for arbitrage
 */
export type QuotePreference = "price" | "speed" | "input-priority" | "trust-minimization";

/**
 * Failure handling policy
 * @description Defines how to handle transaction failures or partial fills
 * - "refund-automatic": Automatic refund on failure without user action
 * - "refund-claim": User must claim refund manually after failure
 * - "needs-new-signature": Requires new user signature to retry or refund
 * @example "refund-automatic" - Best UX, protocol handles refunds
 * @example "refund-claim" - User retains control over refund timing
 * @example "needs-new-signature" - Maximum security, new approval for any action
 */
export type FailureHandlingMode = "refund-automatic" | "refund-claim" | "needs-new-signature";

/**
 * Request for generating quotes
 * @description Request payload for obtaining swap quotes from providers. Contains all necessary
 *              information for providers to calculate and return executable quotes.
 * @example Exact-input quote request (user has 4000 USDC, wants USDT quote):
 * {
 *   user: "0x000100000101742d35Cc6634C0532925a3b844Bc9e7595f0bEb8",
 *   intent: {
 *     intentType: "oif-swap",
 *     inputs: [{
 *       user: "0x000100000101742d35Cc6634C0532925a3b844Bc9e7595f0bEb8",
 *       asset: "0x000100000101A0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", // USDC
 *       amount: "4000000000" // Exact: 4000 USDC
 *     }],
 *     outputs: [{
 *       receiver: "0x000100000101742d35Cc6634C0532925a3b844Bc9e7595f0bEb8",
 *       asset: "0x000100000101dAC17F958D2ee523a2206206994597C13D831ec7", // USDT
 *       amount: undefined // Provider will quote output amount
 *     }],
 *     swapType: "exact-input",
 *     preference: "price"
 *   },
 *   supportedTypes: ["oif-escrow-v0"]
 * }
 * @example Exact-output quote request (user wants exactly 2 ETH, needs USDC quote):
 * {
 *   user: "0x00010000a4b1742d35Cc6634C0532925a3b844Bc9e7595f0bEb8", // Arbitrum
 *   intent: {
 *     intentType: "oif-swap",
 *     inputs: [{
 *       user: "0x00010000a4b1742d35Cc6634C0532925a3b844Bc9e7595f0bEb8",
 *       asset: "0x00010000a4b1af48D7b320B0A4d3233e91B1c865238AE8", // USDC on Arbitrum
 *       amount: undefined // Provider will quote input amount needed
 *     }],
 *     outputs: [{
 *       receiver: "0x00010000a4b1742d35Cc6634C0532925a3b844Bc9e7595f0bEb8",
 *       asset: "0x00010000a4b182e0B297B003493027903951655AF9d0e", // WETH on Arbitrum
 *       amount: "2000000000000000000" // Exact: 2 WETH
 *     }],
 *     swapType: "exact-output",
 *     preference: "speed"
 *   },
 *   supportedTypes: ["oif-resource-lock-v0"]
 * }
 */
export interface GetQuoteRequest {
    /** User requesting the quote and recipient of refund inputs in case of failures */
    user: Address;

    intent: {
        intentType: "oif-swap";
        /** Available inputs for the quote. Order is significant if preference is 'input-priority' */
        inputs: Input[];
        /** Requested outputs for the quote */
        outputs: Output[];
        /**
         * Swap type for the quote
         * @description Determines which amounts are fixed vs quoted
         * @default "exact-input"
         */
        swapType?: SwapType;
        /** Minimum validity timestamp in seconds */
        minValidUntil?: number;
        /** Quote preference */
        preference?: QuotePreference;
        /**
         * Explicit preference for submission responsibility and acceptable auth schemes.
         */
        originSubmission?: OriginSubmission;

        /** Failure handling policy for execution that the integrator supports*/
        failureHandling?: FailureHandlingMode[];
        /** Whether the integrator supports partial fills */
        partialFill?: boolean;
        /** Metadata for the order, never required, potentially contains provider specific data */
        metadata?: object;
    };
    supportedTypes: string[]; // Order types supported by the provider
}

/**
 * Order type union
 * @description Represents all possible order types supported by the OIF protocol.
 *              Each order type has different security and execution characteristics.
 */
export type Order = OifEscrowOrder | OifResourceLockOrder | Oif3009Order | OifUserOpenIntentOrder;

/**
 * Escrow-based order
 * @description Order that uses an escrow mechanism for asset custody during cross-chain transfers.
 *              Assets are held in escrow until conditions are met. Uses Permit2's PermitBatchWitnessTransferFrom
 *              for efficient batch transfers with additional witness data.
 * @example
 * {
 *   type: "oif-escrow-v0",
 *   payload: {
 *     signatureType: "eip712",
 *     domain: { name: "Permit2", version: "1", chainId: 1, verifyingContract: "0x000000000022D473030F116dDEE9F6B43aC78BA3" },
 *     primaryType: "PermitBatchWitnessTransferFrom",
 *     message: {
 *       permitted: [
 *         { token: "0x000100000101A0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", amount: "1000000000" }
 *       ],
 *       spender: "0x00010000010195ad61b0a150d79219dcf64e1e6cc01f0c0c8a4a",
 *       nonce: "123",
 *       deadline: 1700000000,
 *       witness: {
 *         recipient: "0x000100000101742d35Cc6634C0532925a3b844Bc9e7595f0bEb8",
 *         minAmountOut: "990000000"
 *       }
 *     }
 *   }
 * }
 */
export interface OifEscrowOrder {
    /** Order type identifier for escrow-based execution */
    type: "oif-escrow-v0";
    payload: {
        signatureType: "eip712";
        domain: object;
        primaryType: string;
        message: object;
        /** EIP-712 types used to construct the digest */
        types: EIP712Types;
    };
}

/**
 * Resource lock-based order
 * @description Order that uses resource locking for asset control, typically with The Compact
 *              protocol for efficient batch operations and cross-chain transfers. Uses Compact
 *              signatures (e.g., BatchCompact) for gas-efficient multi-operation authorization.
 * @example With Compact/BatchCompact signature:
 * {
 *   type: "oif-resource-lock-v0",
 *   payload: {
 *     signatureType: "eip712",
 *     domain: { name: "The Compact", version: "1", chainId: 1, verifyingContract: "0xabc..." },
 *     primaryType: "BatchCompact",
 *     message: {
 *       arbiter: "0x000100000101742d35Cc6634C0532925a3b844Bc9e7595f0bEb8",
 *       sponsor: "0x00010000010195ad61b0a150d79219dcf64e1e6cc01f0c0c8a4a",
 *       nonce: "123",
 *       expires: 1700000000,
 *       transfers: [
 *         { token: "0x000100000101A0b8...", amount: "1000000000", recipient: "0x..." }
 *       ]
 *     }
 *   }
 * }
 */
/**
 * EIP-712 type property
 * @description Single field definition used inside the EIP-712 `types` map
 * @example { name: "amount", type: "uint256" }
 */
export interface EIP712TypeProperty {
    /** Field name */
    name: string;
    /** Solidity/EVM type */
    type: string;
}

/**
 * EIP-712 types mapping
 * @description Map from type name to its field definitions, per EIP-712
 * @example {
 *   EIP712Domain: [
 *     { name: "name", type: "string" },
 *     { name: "version", type: "string" },
 *     { name: "chainId", type: "uint256" },
 *     { name: "verifyingContract", type: "address" }
 *   ],
 *   BatchCompact: [
 *     { name: "arbiter", type: "address" },
 *     { name: "sponsor", type: "address" },
 *     { name: "nonce", type: "uint256" },
 *     { name: "expires", type: "uint256" },
 *     { name: "commitments", type: "Lock[]" },
 *     { name: "mandate", type: "Mandate" }
 *   ]
 * }
 */
export type EIP712Types = Record<string, EIP712TypeProperty[]>;

export interface OifResourceLockOrder {
    /** Order type identifier for resource lock-based execution */
    type: "oif-resource-lock-v0";
    payload: {
        signatureType: "eip712";
        domain: object;
        primaryType: string;
        message: object;
        /** EIP-712 types used to construct the digest */
        types: EIP712Types;
    };
}

/**
 * EIP-3009 based order
 * @description Order using EIP-3009 Transfer With Authorization standard, commonly used by
 *              stablecoins like USDC. Includes metadata for nonce verification.
 * @example
 * {
 *   type: "oif-3009-v0",
 *   payload: {
 *     signatureType: "eip712",
 *     domain: { name: "USD Coin", version: "2", chainId: 1, verifyingContract: "0xA0b8..." },
 *     primaryType: "TransferWithAuthorization",
 *     message: {
 *       from: "0x000100000101742d35Cc6634C0532925a3b844Bc9e7595f0bEb8",
 *       to: "0x00010000010195ad61b0a150d79219dcf64e1e6cc01f0c0c8a4a",
 *       value: "1000000000",
 *       validAfter: 0,
 *       validBefore: 1700000000,
 *       nonce: "0xabcd1234..."
 *     }
 *   },
 *   metadata: {
 *     orderHash: "0xdef456...",
 *     chainId: 1,
 *     tokenAddress: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"
 *   }
 * }
 */
export interface Oif3009Order {
    /** Order type identifier for EIP-3009 transfers */
    type: "oif-3009-v0";
    /** EIP-3009 Transfer With Authorization typed data */
    payload: {
        /** Signature type indicator */
        signatureType: "eip712";
        /** EIP-712 domain separator */
        domain: object;
        /** Primary type name (typically "TransferWithAuthorization") */
        primaryType: string;
        /** The transfer authorization message */
        message: object;
        /** EIP-712 types used to construct the digest */
        types: EIP712Types;
    };
    /** Additional metadata for nonce verification and order tracking */
    metadata: object;
}

/**
 * User open intent order
 * @description Order that carries a user-submitted open intent transaction for execution by a
 *              settlement/settler contract. Includes safety checks such as required allowances
 *              that must be satisfied prior to execution.
 * @example
 * {
 *   type: "oif-user-open-v0",
 *   openIntentTx: {
 *     to: "0x00010000010195ad61b0a150d79219dcf64e1e6cc01f0c0c8a4a",
 *     data: "0xaaaaaaaa....", // bytes in solidity
 *     gasRequired: "250000"
 *   },
 *   checks: {
 *     allowances: [{
 *       token: "0x000100000101A0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
 *       user: "0x000100000101742d35Cc6634C0532925a3b844Bc9e7595f0bEb8",
 *       spender: "0x00010000010195ad61b0a150d79219dcf64e1e6cc01f0c0c8a4a",
 *       required: "1000000000"
 *     }]
 *   }
 * }
 */
export interface OifUserOpenIntentOrder {
    /** Order type identifier for user open intent execution */
    type: "oif-user-open-v0";
    /**
     * Open intent transaction to be executed by the settlement contract
     * @description Encoded call with destination using EIP-7930 address format and raw calldata bytes
     */
    openIntentTx: {
        /** Destination contract in EIP-7930 address format */
        to: Address;
        /** Raw calldata bytes for the transaction */
        data: Uint8Array;
        /** Gas required for execution as a decimal string */
        gasRequired: string;
    };
    /**
     * Allowance and balance checks that must hold prior to execution
     */
    checks: {
        /**
         * Required allowances and balances
         * @description Each item asserts that `user` has at least `required` balance andallowance for `spender` on `token`.
         */
        allowances: Array<{
            /** Token address in EIP-7930 format */
            token: Address;
            /** User address in EIP-7930 format */
            user: Address;
            /** Spender/settlement contract address in EIP-7930 format */
            spender: Address;
            /** Required allowance amount as string-encoded integer */
            required: Amount;
        }>;
    };
}

/**
 * Quote information
 * @description Complete quote details returned by a provider, including execution parameters,
 *              validity period, and settlement information.
 * @example
 * {
 *   order: { type: "oif-escrow-v0", payload: { ... } },
 *   validUntil: 1700000000,
 *   eta: 30,
 *   quoteId: "quote-123-abc",
 *   provider: "UniswapX",
 *   failureHandling: "refund-automatic",
 *   partialFill: false
 * }
 */
export interface Quote {
    order: Order;

    /** Quote validity timestamp in seconds */
    validUntil?: number;
    /** Estimated time of arrival in seconds */
    eta?: number;
    /** Unique quote identifier */
    quoteId?: string;
    /** Provider identifier */
    provider?: string;
    /**
     * Informational amounts for UX/display, must be verified against the order
     */
    preview: QuotePreview;
    /** Failure handling policy for execution*/
    failureHandling: FailureHandlingMode;
    /** Whether the quote supports partial fills */
    partialFill: boolean;
    /** Metadata for the order, never required, potentially contains provider specific data */
    metadata?: object;
    /** Allow extra fields from solver-specific implementations (e.g., solverId, integrityChecksum) */
    [key: string]: unknown;
}

/**
 * Response containing generated quotes
 * @description Response from quote providers containing one or more executable quotes.
 *              Providers may return multiple quotes with different characteristics.
 * @example
 * {
 *   quotes: [
 *     {
 *       order: { type: "oif-escrow-v0", payload: { ... } },
 *       validUntil: 1700000000,
 *       eta: 30,
 *       quoteId: "quote-123",
 *       provider: "Provider1",
 *       failureHandling: "refund-automatic",
 *       partialFill: false
 *     },
 *     {
 *       order: { type: "oif-resource-lock-v0", payload: { ... } },
 *       validUntil: 1700000100,
 *       eta: 15,
 *       quoteId: "quote-456",
 *       provider: "Provider2",
 *       failureHandling: "refund-claim",
 *       partialFill: true
 *     }
 *   ]
 * }
 */
export interface GetQuoteResponse {
    /**
     * Array of generated quotes
     * @description List of available quotes, may be empty if no quotes are available
     */
    quotes: Quote[];
}

/**
 * Request to submit an order
 * @description Request payload for submitting a signed order for execution.
 *              Contains the order data, signature, and optional routing hints.
 * @example
 * {
 *   order: { type: "oif-escrow-v0", payload: { ... } },
 *   signature: 0x12345678,
 *   quoteId: "quote-123-abc",
 *   originSubmission: { mode: "protocol", schemes: ["permit2"] }
 * }
 */
export interface PostOrderRequest {
    /** EIP-712 typed data for a gasless cross-chain order */
    order: Order;
    /** EIP-712 signature or equivalent */
    signature: Uint8Array; // bytes in solidity
    /** Optional quote identifier from a prior Get Quote response */
    quoteId?: string;
    /** Optional preference mirrored from quote about who submits and acceptable schemes */
    originSubmission?: OriginSubmission;
}

/**
 * Status enum for order submission responses
 * @description Indicates the immediate status of an order submission. Note that "received" only
 *              means basic validation passed - full validation happens asynchronously.
 * @example PostOrderResponseStatus.Received - Order accepted for processing
 * @example PostOrderResponseStatus.Rejected - Invalid signature or expired quote
 * @example PostOrderResponseStatus.Error - Internal server error
 */
export enum PostOrderResponseStatus {
    /**
     * Order received and passed basic validation, queued for full validation
     * @description Order syntax is valid and will be processed asynchronously
     */
    Received = "received",
    /**
     * Order rejected due to validation failure
     * @description Order failed immediate validation (bad signature, expired, etc.)
     */
    Rejected = "rejected",
    /**
     * Order processing encountered an error
     * @description Unexpected error during order submission
     */
    Error = "error",
}

/**
 * Response from order submission
 * @description Response returned after submitting an order, including status and order ID if accepted.
 * @example Success:
 * {
 *   orderId: "order-789-xyz",
 *   status: PostOrderResponseStatus.Received,
 *   message: "Order accepted for processing",
 *   order: { ... }
 * }
 * @example Rejection:
 * {
 *   status: PostOrderResponseStatus.Rejected,
 *   message: "Invalid signature"
 * }
 */
export interface PostOrderResponse {
    /** Assigned order identifier if accepted */
    orderId?: string;
    /** Status of the order submission */
    status: PostOrderResponseStatus;
    /** Optional message for additional details on status */
    message?: string;
    /** The submitted EIP-712 typed data order */
    order?: Record<string, unknown>;
}

/**
 * Order status enum for order tracking
 * @description Tracks the complete lifecycle of an order from creation to finalization.
 *              Orders progress through these states based on execution and settlement.
 * @example Typical flow: Created -> Pending -> Executed -> Settled -> Finalized
 * @example Failed flow: Created -> Pending -> Failed
 */
export enum OrderStatus {
    /**
     * Order has been created but not yet prepared
     * @description Initial state when order is first recorded
     */
    Created = "created",
    /**
     * Order is pending execution
     * @description Order is valid and waiting to be executed on-chain
     */
    Pending = "pending",
    /**
     * Order has been executed
     * @description Transaction has been submitted to the blockchain
     */
    Executed = "executed",
    /**
     * Order has been settled and is ready to be claimed
     * @description Assets are available for claiming by the receiver
     */
    Settled = "settled",
    /**
     * Order is partially executed
     * @description Some transactions has been submitted to the blockchain
     */
    Executing = "executing",
    /**
     * Order is settling and is ready to be claimed
     * @description Some assets are available for claiming by the receiver
     */
    Settling = "settling",
    /**
     * Order is finalized and complete (after all claims are confirmed)
     * @description All aspects of the order are complete, including claims
     */
    Finalized = "finalized",
    /**
     * Order execution failed
     * @description Order could not be executed due to errors or conditions not met
     */
    Failed = "failed",
    /**
     * Order execution failed and inputs have been refunded
     * @description Order was not filled and assets have been refunded
     */
    Refunded = "refunded",
}

/**
 * Asset amount representation
 * @description Combines an asset identifier with an amount, using EIP-7930 addresses for
 *              cross-chain compatibility.
 * @example Cross-chain:
 * {
 *   asset: "0x00010000018903A0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", // USDC on Polygon (chain 137 = 0x89 in hex, 0x8903 in EIP-7930)
 *   amount: "500000000" // 500 USDC (6 decimals)
 * }
 */
export interface AssetAmount {
    /**
     * Asset address in EIP-7930 interoperable format
     * @description The token/asset identifier, may include chain information
     */
    asset: Address;
    /**
     * Amount as a string-encoded integer
     * @description Token amount in smallest unit (wei, satoshi, etc.)
     */
    amount?: Amount;
}

/**
 * Settlement mechanism types
 * @description Defines how assets are secured and transferred in cross-chain operations.
 *              Different mechanisms offer various trust and efficiency tradeoffs.
 * @example SettlementType.Escrow - Traditional escrow with third-party custody
 * @example SettlementType.ResourceLock - Programmable locks with automated conditions
 * TODO: Add additional lock types to this schema as protocol expands
 */
export enum SettlementType {
    /**
     * Escrow-based settlement
     * @description Assets held by escrow contract until conditions are met
     */
    Escrow = "escrow",
    /**
     * Resource lock-based settlement
     * @description Assets controlled by programmable locks (e.g., account abstraction)
     */
    ResourceLock = "resourceLock",
}

/**
 * Settlement information for an order
 * @description Contains details about how an order will be settled, including the mechanism
 *              and any mechanism-specific parameters.
 * @example
 * {
 *   type: SettlementType.Escrow,
 *   data: {
 *     escrowContract: "0x123...",
 *     releaseTime: 1700000000,
 *     arbiter: "0xabc..."
 *   }
 * }
 */
export interface Settlement {
    /**
     * Settlement mechanism type
     * @description The type of settlement mechanism used for this order
     */
    type: SettlementType;
    /**
     * Settlement-specific data
     * @description Additional parameters specific to the settlement type
     * @example For escrow: { escrowContract: "0x...", timeout: 3600 }
     * @example For resource lock: { lockId: "lock-123", unlockCondition: "0x..." }
     */
    data: Record<string, unknown>;
}

/**
 * Request to get order details
 * @description Request parameters for retrieving a specific order by its unique identifier.
 * @example { id: "order-789-xyz" }
 */
export interface GetOrderRequest {
    /**
     * Order identifier
     * @description Unique ID assigned to the order upon submission
     * @example "order-789-xyz"
     */
    id: string;
}

/**
 * Order response for API endpoints
 * @description Complete order information including status, amounts, settlement details, and
 *              transaction data. Returned by GET /orders/{id} endpoint.
 * @example
 * {
 *   id: "order-789-xyz",
 *   status: OrderStatus.Settled,
 *   createdAt: 1699900000,
 *   updatedAt: 1699900100,
 *   quoteId: "quote-123-abc",
 *   inputAmount: [{
 *     asset: "0x000100000101742d35Cc6634C0532925a3b844Bc9e7595f0bEb8",
 *     amount: "1000000000"
 *   }],
 *   outputAmount: [{
 *     asset: "0x000100000101742d35Cc6634C0532925a3b844Bc9e7595f0bEb9",
 *     amount: "500000000000000000"
 *   }],
 *   settlement: {
 *     type: SettlementType.Escrow,
 *     data: { escrowContract: "0x123...", claimable: true }
 *   },
 *   fillTransaction:[ {
 *     hash: "0xabc...",
 *     blockNumber: 18500000
 *   }]
 * }
 */
export interface GetOrderResponse {
    /** Unique identifier for this order */
    id: string;
    /** Current order status */
    status: OrderStatus;
    /** Timestamp when this order was created (Unix timestamp in seconds) */
    createdAt: number;
    /** Timestamp when this order was last updated (Unix timestamp in seconds) */
    updatedAt: number;
    /** Associated quote ID if available */
    quoteId?: string;
    /** Input assets and amounts */
    inputAmounts: AssetAmount[];
    /** Output assets and amounts */
    outputAmounts: AssetAmount[];
    /** Settlement information */
    settlement: Settlement;
    /** Transaction details if order has been executed */
    fillTransaction?: Record<string, unknown>;
}
