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
} from "../../internal.js";
import {
    SUPERBRIDGE_API_URL,
    SUPERBRIDGE_DEFAULT_SUBMISSION_MODES,
    SUPERBRIDGE_PROTOCOL_NAME,
    SUPERBRIDGE_REQUEST_TIMEOUT_MS,
} from "./constants.js";
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

    /** @inheritdoc */
    async getQuotes(_params: QuoteRequest): Promise<Quote[]> {
        throw new ProviderExecuteNotImplemented(this.getProviderId());
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
