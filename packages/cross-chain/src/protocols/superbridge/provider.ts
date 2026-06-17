import { ZodError } from "zod";

import type { SubmissionMode } from "../../core/schemas/providerConfig.js";
import type {
    FillWatcherConfig,
    HttpClient,
    OpenedIntentParserConfig,
    PreTrackerConfig,
    Quote,
    QuoteRequest,
} from "../../internal.js";
import type { SuperbridgeConfigs } from "./types.js";
import {
    CrossChainProvider,
    FetchHttpClient,
    ProviderConfigFailure,
    ProviderExecuteNotImplemented,
    ProviderGetQuoteFailure,
} from "../../internal.js";
import { adaptQuoteRequest, adaptQuoteResponse } from "./adapters/index.js";
import {
    SUPERBRIDGE_API_URL,
    SUPERBRIDGE_DEFAULT_SUBMISSION_MODES,
    SUPERBRIDGE_PROTOCOL_NAME,
    SUPERBRIDGE_REQUEST_TIMEOUT_MS,
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

    /** @inheritdoc */
    getTrackingConfig(): {
        openedIntentParserConfig: OpenedIntentParserConfig;
        fillWatcherConfig: FillWatcherConfig;
        preTrackerConfig?: PreTrackerConfig;
    } {
        throw new ProviderExecuteNotImplemented(this.getProviderId());
    }
}
