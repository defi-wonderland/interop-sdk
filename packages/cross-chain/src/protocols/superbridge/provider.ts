import type { Hex } from "viem";
import { ZodError } from "zod";

import type { SubmissionMode } from "../../core/schemas/providerConfig.js";
import type {
    AssetDiscoveryConfig,
    FillWatcherConfig,
    GetFillParams,
    HttpClient,
    OpenedIntentParserConfig,
    PreTrackerConfig,
    PreTrackerParams,
    Quote,
    QuoteRequest,
} from "../../internal.js";
import type { SuperbridgeConfigs } from "./types.js";
import {
    CrossChainProvider,
    FetchHttpClient,
    ProviderConfigFailure,
    ProviderGetQuoteFailure,
} from "../../internal.js";
import {
    adaptOpenedIntentResponse,
    adaptQuoteRequest,
    adaptQuoteResponse,
    extractFillEvent,
    parseSuperbridgeTokens,
} from "./adapters/index.js";
import {
    SUPERBRIDGE_API_URL,
    SUPERBRIDGE_DEFAULT_SUBMISSION_MODES,
    SUPERBRIDGE_PROTOCOL_NAME,
    SUPERBRIDGE_REQUEST_TIMEOUT_MS,
    SUPERBRIDGE_TOKENS_PAGE_LIMIT,
} from "./constants.js";
import { SuperbridgeApiService } from "./services/index.js";
import { SuperbridgeConfigSchema } from "./types.js";

/**
 * A {@link CrossChainProvider} implementation for the Superbridge protocol.
 *
 * @see https://docs.superbridge.app/
 */
export class SuperbridgeProvider extends CrossChainProvider {
    readonly protocolName = SUPERBRIDGE_PROTOCOL_NAME;
    readonly providerId: string;
    private readonly http: HttpClient;
    private readonly apiService: SuperbridgeApiService;
    private readonly baseUrl: string;
    private readonly apiHeaders: Record<string, string>;
    private readonly submissionModes: ReadonlySet<SubmissionMode>;

    constructor(config: SuperbridgeConfigs) {
        super();

        try {
            const parsed = SuperbridgeConfigSchema.parse(config);
            this.baseUrl = parsed.baseUrl ?? SUPERBRIDGE_API_URL;
            this.providerId = parsed.providerId ?? SUPERBRIDGE_PROTOCOL_NAME;
            this.submissionModes = new Set<SubmissionMode>(
                parsed.submissionModes ?? SUPERBRIDGE_DEFAULT_SUBMISSION_MODES,
            );

            this.apiHeaders = {};
            if (parsed.apiKey) {
                this.apiHeaders["x-api-key"] = parsed.apiKey;
            }
            this.http = new FetchHttpClient({
                baseURL: this.baseUrl,
                headers: this.apiHeaders,
                timeout: SUPERBRIDGE_REQUEST_TIMEOUT_MS,
            });
            this.apiService = new SuperbridgeApiService(this.http);
        } catch (error) {
            if (error instanceof ZodError) {
                throw new ProviderConfigFailure(
                    "Failed to parse Superbridge config",
                    error.message,
                    error.stack,
                );
            }
            throw new ProviderConfigFailure(
                "Failed to configure Superbridge provider",
                String(error),
                error instanceof Error ? error.stack : undefined,
            );
        }
    }

    /**
     * @inheritdoc
     *
     * Fetches bridging routes from `/v1/routes` and maps each successful route
     * whose initiating transaction matches an enabled submission mode.
     */
    async getQuotes(params: QuoteRequest): Promise<Quote[]> {
        try {
            const request = adaptQuoteRequest(params);
            const response = await this.apiService.getRoutes(request);
            return adaptQuoteResponse(response, this.providerId, params, this.submissionModes);
        } catch (error) {
            if (error instanceof ProviderGetQuoteFailure) throw error;
            throw new ProviderGetQuoteFailure(
                error instanceof Error ? error.message : "Failed to get Superbridge quotes",
                undefined,
                error instanceof Error ? error.stack : undefined,
            );
        }
    }

    /**
     * @inheritdoc
     * Returns API-based tracking config using the Superbridge `/v1/activity` endpoint,
     * with `/v1/index_transaction` as the pre-tracker.
     */
    getTrackingConfig(): {
        openedIntentParserConfig: OpenedIntentParserConfig;
        fillWatcherConfig: FillWatcherConfig;
        preTrackerConfig: PreTrackerConfig;
    } {
        const headers = this.apiHeaders;

        return {
            openedIntentParserConfig: {
                type: "api",
                config: {
                    protocolName: SUPERBRIDGE_PROTOCOL_NAME,
                    headers,
                    buildUrl: (txHash: Hex): string =>
                        `${this.baseUrl}/v1/activity?txHash=${txHash}`,
                    extractOpenedIntent: adaptOpenedIntentResponse,
                },
            },
            fillWatcherConfig: {
                type: "api-based",
                baseUrl: this.baseUrl,
                headers,
                pollingInterval: 5000,
                retry: {
                    maxAttempts: 3,
                    initialDelay: 2000,
                    maxDelay: 15000,
                    backoffMultiplier: 2,
                },
                buildEndpoint: (params: GetFillParams): string =>
                    `/v1/activity?txHash=${params.openTxHash ?? params.orderId}`,
                extractFillEvent,
            },
            preTrackerConfig: {
                type: "api",
                protocolName: SUPERBRIDGE_PROTOCOL_NAME,
                buildUrl: (): string => `${this.baseUrl}/v1/index_transaction`,
                buildBody: (params: PreTrackerParams): Record<string, unknown> => ({
                    txHash: params.txHash,
                    chainId: String(params.originChainId),
                }),
                headers,
            },
        };
    }

    /**
     * @inheritdoc
     * Returns API-based discovery config using the Superbridge `/v1/tokens` endpoint.
     */
    override getDiscoveryConfig(): AssetDiscoveryConfig {
        return {
            type: "custom-api",
            config: {
                assetsEndpoint: `${this.baseUrl}/v1/tokens?limit=${SUPERBRIDGE_TOKENS_PAGE_LIMIT}`,
                parseResponse: parseSuperbridgeTokens,
                headers: this.apiHeaders,
            },
        };
    }
}
