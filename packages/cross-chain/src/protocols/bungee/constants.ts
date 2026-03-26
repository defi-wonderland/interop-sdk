import { BungeeApiTier } from "./types.js";

/** Base URLs for each Bungee API tier. */
export const BUNGEE_API_URLS: Record<BungeeApiTier, string> = {
    [BungeeApiTier.Sandbox]: "https://public-backend.bungee.exchange",
    [BungeeApiTier.Dedicated]: "https://dedicated-backend.bungee.exchange",
    [BungeeApiTier.Frontend]: "https://backend.bungee.exchange",
};

/** Default Bungee API base URL (public sandbox). */
export const BUNGEE_API_URL = BUNGEE_API_URLS[BungeeApiTier.Sandbox];
