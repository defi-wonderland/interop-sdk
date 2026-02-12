import axios from "axios";
import { ZodError } from "zod";

import {
    buildAggregatorSolverEndpoint,
    parseAggregatorSolverResponse,
} from "../adapters/assetDiscoveryAdapter.js";
import { AssetDiscoveryFailure } from "../errors/AssetDiscoveryFailure.exception.js";
import { getAssetsResponseSchema } from "../schemas/assetDiscovery.js";
import { AssetDiscoveryResult } from "../types/assetDiscovery.js";
import {
    BaseAssetDiscoveryService,
    BaseAssetDiscoveryServiceConfig,
} from "./BaseAssetDiscoveryService.js";

/**
 * Configuration for OIF Asset Discovery Service
 */
export interface OIFAssetDiscoveryServiceConfig extends BaseAssetDiscoveryServiceConfig {
    /**
     * Base URL of the OIF-compliant solver API
     * @example "https://api.solver.com"
     */
    baseUrl: string;
    /**
     * Solver ID — when present, uses workaround endpoint
     * instead of spec-compliant GET /api/tokens.
     *
     * @see https://github.com/openintentsframework/oif-solver/issues/295
     */
    solverId?: string;
}

/**
 * OIF Asset Discovery Service Implementation
 *
 * Fetches supported assets from OIF-compliant solvers using the standard
 * /api/tokens endpoint. Includes in-memory caching with configurable TTL.
 *
 * WORKAROUND: When solverId is provided, uses GET /v1/solvers/{solverId}
 * instead of spec-compliant GET /api/tokens (solver response uses `tokens` instead of `assets`).
 * @see https://github.com/openintentsframework/oif-solver/issues/295
 */
export class OIFAssetDiscoveryService extends BaseAssetDiscoveryService {
    private readonly baseUrl: string;
    private readonly solverId?: string;

    constructor(config: OIFAssetDiscoveryServiceConfig) {
        super(config);
        this.baseUrl = config.baseUrl.replace(/\/$/, ""); // Remove trailing slash
        this.solverId = config.solverId;
    }

    /**
     * Fetch assets from the OIF API
     */
    protected async fetchAssets(timeout: number): Promise<AssetDiscoveryResult> {
        // WORKAROUND: solver response doesn't match oif-specs yet (#295)
        if (this.solverId) {
            return this.fetchAssetsViaWorkaround(timeout);
        }

        const url = `${this.baseUrl}/api/tokens`;

        try {
            const response = await axios.get(url, {
                headers: this.headers ?? {},
                timeout,
            });

            if (response.status !== 200) {
                throw new AssetDiscoveryFailure(
                    "Failed to fetch assets from OIF API",
                    `Unexpected status code: ${response.status}. URL: ${url}`,
                );
            }

            // Validate response against schema
            const validated = getAssetsResponseSchema.parse(response.data);

            // Convert from Record<string, NetworkAssets> to NetworkAssets[]
            const networks = Object.values(validated.networks);

            return {
                networks,
                fetchedAt: Date.now(),
                providerId: this.providerId,
            };
        } catch (error) {
            if (error instanceof AssetDiscoveryFailure) {
                throw error;
            }

            if (error instanceof ZodError) {
                throw new AssetDiscoveryFailure(
                    "Failed to validate OIF asset discovery response",
                    error.message,
                    error.stack,
                );
            }

            throw this.wrapError(error, "OIF API", url, timeout);
        }
    }

    /**
     * WORKAROUND: Fetch assets via GET /v1/solvers/{solverId}
     *
     * Remove when solver aligns GET /api/tokens response with oif-specs.
     * @see https://github.com/openintentsframework/oif-solver/issues/295
     */
    private async fetchAssetsViaWorkaround(timeout: number): Promise<AssetDiscoveryResult> {
        const url = buildAggregatorSolverEndpoint(this.baseUrl, this.solverId!);

        try {
            const response = await axios.get(url, {
                headers: this.headers ?? {},
                timeout,
            });

            if (response.status !== 200) {
                throw new AssetDiscoveryFailure(
                    "Failed to fetch assets from OIF solver",
                    `Unexpected status code: ${response.status}. URL: ${url}`,
                );
            }

            const networks = parseAggregatorSolverResponse(response.data);

            return {
                networks,
                fetchedAt: Date.now(),
                providerId: this.providerId,
            };
        } catch (error) {
            if (error instanceof AssetDiscoveryFailure) {
                throw error;
            }

            throw this.wrapError(error, "OIF solver (workaround)", url, timeout);
        }
    }
}
