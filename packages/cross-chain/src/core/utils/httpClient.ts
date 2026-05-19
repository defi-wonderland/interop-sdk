/**
 * Minimal `fetch`-based HTTP client. Replaces axios so the SDK runs under
 * SES (LavaMoat / MetaMask Snaps), where `lockdown()` makes axios incompatible.
 *
 * @see https://docs.metamask.io/snaps/how-to/debug-a-snap/common-issues/
 * @see https://www.npmjs.com/package/ses
 */

import type {
    HttpClient,
    HttpClientConfig,
    HttpRequestOptions,
    HttpResponse,
} from "../interfaces/httpClient.interface.js";
import { HttpError } from "../errors/HttpError.exception.js";
import { HttpNetworkError } from "../errors/HttpNetworkError.exception.js";
import { HttpTimeout } from "../errors/HttpTimeout.exception.js";

interface TimeoutHandle {
    signal: AbortSignal;
    timedOut: boolean;
    clear: () => void;
}

/** {@link HttpClient} implementation backed by native `fetch`. */
export class FetchHttpClient implements HttpClient {
    constructor(private readonly config: HttpClientConfig = {}) {}

    get<T = unknown>(
        path: string,
        options?: Omit<HttpRequestOptions, "method" | "body">,
    ): Promise<HttpResponse<T>> {
        return this.request<T>(path, { ...options, method: "GET" });
    }

    post<T = unknown>(
        path: string,
        body?: object,
        options?: Omit<HttpRequestOptions, "method" | "body">,
    ): Promise<HttpResponse<T>> {
        return this.request<T>(path, { ...options, method: "POST", body });
    }

    async request<T = unknown>(
        path: string,
        options: HttpRequestOptions = {},
    ): Promise<HttpResponse<T>> {
        const url = this.buildUrl(path, options.params);
        const timeout = options.timeout ?? this.config.timeout;
        const timer = this.startTimeout(timeout);
        const init = { ...this.buildRequestInit(options), signal: timer.signal };

        let response: Response;
        let text: string;
        try {
            response = await fetch(url, init);
            text = await response.text();
        } catch (err) {
            throw this.wrapTransportError(err, url, timer.timedOut, timeout);
        } finally {
            timer.clear();
        }

        return this.buildResponse<T>(response, text, url);
    }

    private buildUrl(path: string, params?: Record<string, unknown>): string {
        const url = this.resolveUrl(path);
        if (params) {
            for (const [key, value] of Object.entries(params)) {
                if (value != null) url.searchParams.set(key, String(value));
            }
        }
        return url.toString();
    }

    private resolveUrl(path: string): URL {
        const { baseURL } = this.config;
        const base = baseURL && !baseURL.endsWith("/") ? `${baseURL}/` : baseURL;
        const resolvedPath = base ? path.replace(/^\//, "") : path;
        return new URL(resolvedPath, base);
    }

    private buildRequestInit(options: HttpRequestOptions): Omit<RequestInit, "signal"> {
        const hasBody = options.body != null;
        return {
            method: options.method ?? "GET",
            headers: {
                ...(hasBody && { "Content-Type": "application/json" }),
                ...this.config.headers,
                ...options.headers,
            },
            body: hasBody ? JSON.stringify(options.body) : undefined,
        };
    }

    private startTimeout(timeout: number | undefined): TimeoutHandle {
        const controller = new AbortController();
        const handle: TimeoutHandle = {
            signal: controller.signal,
            timedOut: false,
            clear: () => {},
        };
        if (timeout != null) {
            const id = setTimeout(() => {
                handle.timedOut = true;
                controller.abort();
            }, timeout);
            handle.clear = (): void => clearTimeout(id);
        }
        return handle;
    }

    private wrapTransportError(
        err: unknown,
        url: string,
        timedOut: boolean,
        timeout: number | undefined,
    ): HttpError {
        const cause = err instanceof Error ? err : new Error(String(err));
        return timedOut
            ? new HttpTimeout(url, timeout!, cause)
            : new HttpNetworkError(cause.message, url, cause);
    }

    private buildResponse<T>(response: Response, text: string, url: string): HttpResponse<T> {
        const data = this.parseBody(text);
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

    private parseBody(text: string): unknown {
        if (!text) return undefined;
        try {
            return JSON.parse(text);
        } catch {
            return text;
        }
    }
}

/** Convenience wrapper for a single request without instantiating a client. */
const defaultClient = new FetchHttpClient();
export function httpRequest<T = unknown>(
    url: string,
    options?: HttpRequestOptions,
): Promise<HttpResponse<T>> {
    return defaultClient.request<T>(url, options);
}
