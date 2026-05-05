import { Address, Hex } from "viem";

/**
 * Real mainnet transactions for fork tests and integration testing.
 * Each entry is a known on-chain transaction with documented behavior.
 */

/**
 * Successful LI.FI Intents open on Base (USDC Base -> USDC Arbitrum).
 *
 * Used to verify the Open event ABI matches the layout the LiFi solver
 * actually emits on-chain. The event signature is keccak256 of the canonical
 * type string with `maxSpent` as `uint256[2][]`, not `tuple(address,uint256)[]`.
 *
 * @see https://basescan.org/tx/0xedf9a8237a49212bfb936ea67ad7eb66a20b13a6231c14e2664b9b346b42a370
 */
export const LIFI_INTENTS_OPEN_BASE = {
    txHash: "0xedf9a8237a49212bfb936ea67ad7eb66a20b13a6231c14e2664b9b346b42a370" as Hex,
    originChainId: 8453, // Base
    destinationChainId: 42161, // Arbitrum
    user: "0xd550780b24C8c25ef1471773498dcb63eF415298" as Address,
    orderId: "0xe71f283a8137f86dbe3c2378ed2537c58326dd35e4f274f92ca3507b9a3e5a0b" as Hex,
} as const;

/**
 * Across fill where destination swap failed.
 *
 * 0.4 USDT on Optimism -> cbBTC on Arbitrum. The relay filled USDT to the
 * GenericMulticaller, but the destination swap reverted (CallsFailed).
 * Multicaller drained USDT to user as fallback instead of delivering cbBTC.
 *
 * Across API returns `actionsSucceeded: false` for this deposit.
 *
 * @see https://arbiscan.io/tx/0x94f0445f3d5078632e0694e0c8f28c27e87e1d26b78e698accbf31ce278af8d3
 */
export const ACROSS_FAILED_DESTINATION_SWAP = {
    depositId: 3645613,
    originTxHash: "0x042e8d11225645f242e27355597419a9efe89c579f70376ae015fd137fd77b11" as Hex,
    fillTxHash: "0x94f0445f3d5078632e0694e0c8f28c27e87e1d26b78e698accbf31ce278af8d3" as Hex,
    originChainId: 10, // Optimism
    destinationChainId: 42161, // Arbitrum
    depositor: "0xB08979f3806e2139000d9Dd657E4F58af6b4ca79" as Address, // laruku.eth
    relayer: "0x07aE8551Be970cB1cCa11Dd7a11F47Ae82e70E67" as Address,
    inputToken: "0x94b008aA00579c1307B0EF2c499aD98a8cE58e58" as Address, // USDT on Optimism
    outputToken: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9" as Address, // USDT on Arbitrum (bridged)
    expectedToken: "0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf" as Address, // cbBTC on Arbitrum (requested)
    inputAmount: "400000", // 0.4 USDT
    outputAmount: "376072", // 0.376072 USDT (after bridge fee)
} as const;
