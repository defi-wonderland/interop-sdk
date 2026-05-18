import type { Address } from "viem";

import { BungeeApiTier } from "./types.js";

/** Base URLs for each Bungee API tier. */
export const BUNGEE_API_URLS: Record<BungeeApiTier, string> = {
    [BungeeApiTier.Sandbox]: "https://public-backend.bungee.exchange",
    [BungeeApiTier.Dedicated]: "https://dedicated-backend.bungee.exchange",
    [BungeeApiTier.Frontend]: "https://backend.bungee.exchange",
};

/** Default Bungee API base URL (public sandbox). */
export const BUNGEE_API_URL = BUNGEE_API_URLS[BungeeApiTier.Sandbox];

/** Bridge tracker base URL. Append `/${originTxHash}` for a per-order link. */
export const BUNGEE_EXPLORER_BASE_URL = "https://www.socketscan.io/tx";

/**
 * Canonical BungeeGateway contract per origin chain — the only address the
 * settler may set as `message.spender` in a Permit2 payload. Source:
 * https://docs.bungee.exchange/integrate/contract-addresses.md.
 * Chains absent from this map are not validated; the provider rejects
 * gasless quotes on them (fail-closed, audit V12 #6).
 */
export const BUNGEE_GATEWAY_BY_CHAIN: Record<number, Address> = {
    1: "0xe772551F88E2c14aEcC880dF6b7CBd574561bf82", // Ethereum
    10: "0x09dABDD517FF1E155DeDeF64Ec629cA0285A31AF", // Optimism
    56: "0x9aF2b913679049c966b77934af4CbE7Bb36Cf9D3", // BNB Smart Chain
    100: "0x5e01dbBBe59F8987673FAdD1469DdD2Be71e00af", // Gnosis
    8453: "0x84F06fBaCc4b64CA2f72a4B26191DAD97f2b52BA", // Base
    42161: "0xCdEa28Ee7BD5bf7710B294d9391e1b6A318d809a", // Arbitrum
    43114: "0xfe191a43dc4F3d57d7D942717D259005967e4e0D", // Avalanche
    81457: "0x5525e0700390A12995aC181eFF656E4aC0246b29", // Blast
};
