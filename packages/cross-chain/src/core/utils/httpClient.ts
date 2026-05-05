/**
 * Minimal `fetch`-based HTTP client. Replaces axios so the SDK runs under
 * SES (LavaMoat / MetaMask Snaps), where `lockdown()` makes axios incompatible.
 *
 * @see https://docs.metamask.io/snaps/how-to/debug-a-snap/common-issues/
 * @see https://www.npmjs.com/package/ses
 */

import type {
    HttpClientConfig,
    HttpRequestOptions,
    HttpResponse,
} from "../interfaces/httpClient.interface.js";
import { HttpError } from "../errors/HttpError.exception.js";
import { HttpNetworkError } from "../errors/HttpNetworkError.exception.js";
import { HttpTimeout } from "../errors/HttpTimeout.exception.js";

/** HTTP client with a minimal axios-like surface. */
export class HttpClient {
    constructor(private readonly config: HttpClientConfig = {}) {}

    get<T = unknown>(
        path: string,
        options?: Omit<HttpRequestOptions, "method" | "body">,
    ): Promise<HttpResponse<T>> {
        return this.request<T>(path, { ...options, method: "GET" });
    }

    post<T = unknown>(
        path: string,
        body?: unknown,
        options?: Omit<HttpRequestOptions, "method" | "body">,
    ): Promise<HttpResponse<T>> {
        return this.request<T>(path, { ...options, method: "POST", body });
    }

    async request<T = unknown>(
        path: string,
        options: HttpRequestOptions = {},
    ): Promise<HttpResponse<T>> {
        const { body: rawBody, params, signal, timeout = this.config.timeout } = options;
        const url = buildUrl(path, this.config.baseURL, params);
        const isJsonBody = rawBody != null && typeof rawBody !== "string";

        const controller = new AbortController();
        signal?.addEventListener("abort", () => controller.abort(), { once: true });
        if (signal?.aborted) controller.abort();

        let timedOut = false;
        const timeoutId =
            timeout != null
                ? setTimeout(() => {
                      timedOut = true;
                      controller.abort();
                  }, timeout)
                : undefined;

        let response: Response;
        let text: string;
        try {
            response = await fetch(url, {
                method: options.method ?? "GET",
                headers: {
                    ...(isJsonBody && { "Content-Type": "application/json" }),
                    ...this.config.headers,
                    ...options.headers,
                },
                body: isJsonBody ? JSON.stringify(rawBody) : (rawBody as string | undefined),
                signal: controller.signal,
            });
            text = await response.text();
        } catch (err) {
            const cause = err instanceof Error ? err : new Error(String(err));
            throw timedOut
                ? new HttpTimeout(url, timeout!, cause)
                : new HttpNetworkError(cause.message, url, cause);
        } finally {
            clearTimeout(timeoutId);
        }

        let data: unknown;
        try {
            data = text ? JSON.parse(text) : undefined;
        } catch {
            data = text;
        }

        if (!response.ok) {
            throw new HttpError(
                `Request failed with status ${response.status}`,
                url,
                response.status,
                data,
            );
        }
        return { status: response.status, data: data as T, headers: response.headers };
    }
}

/** One-shot request without a shared client. */
const defaultClient = new HttpClient();
export function httpRequest<T = unknown>(
    url: string,
    options?: HttpRequestOptions,
): Promise<HttpResponse<T>> {
    return defaultClient.request<T>(url, options);
}

function buildUrl(path: string, baseURL?: string, params?: Record<string, unknown>): string {
    const url = new URL(path, baseURL);
    if (params) {
        for (const [key, value] of Object.entries(params)) {
            if (value != null) url.searchParams.set(key, String(value));
        }
    }
    return url.toString();
}
