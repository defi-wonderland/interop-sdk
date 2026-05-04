/**
 * Minimal `fetch`-based HTTP client. Replaces axios so the SDK runs under
 * SES (LavaMoat / MetaMask Snaps), where `lockdown()` makes axios incompatible.
 *
 * @see https://docs.metamask.io/snaps/how-to/debug-a-snap/common-issues/
 * @see https://www.npmjs.com/package/ses
 */

/** Thrown on any non-2xx response, network failure, or timeout. */
export class HttpError extends Error {
    override readonly name = "HttpError";

    constructor(
        message: string,
        readonly url: string,
        /** HTTP status. `0` means no response (network error or timeout). */
        readonly status: number,
        /** Parsed body: JSON value, raw text, or `undefined` when empty. */
        readonly data: unknown,
        /** `ETIMEDOUT` for AbortController timeouts, `ENETWORK` for fetch failures. */
        readonly code?: "ETIMEDOUT" | "ENETWORK",
        override readonly cause?: unknown,
    ) {
        super(message);
    }
}

export interface HttpResponse<T = unknown> {
    status: number;
    data: T;
    headers: Headers;
}

export interface HttpRequestOptions {
    method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    headers?: Record<string, string>;
    /** Objects are JSON-serialized and `Content-Type: application/json` is set. Strings are sent as-is. */
    body?: unknown;
    /** Appended to the URL via `URLSearchParams`. Values are stringified; `null`/`undefined` are skipped. */
    params?: Record<string, unknown>;
    /** Aborts and throws `HttpError` with `code: "ETIMEDOUT"` after this many ms. */
    timeout?: number;
    signal?: AbortSignal;
}

export interface HttpClientConfig {
    baseURL?: string;
    headers?: Record<string, string>;
    timeout?: number;
}

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
        } catch (err) {
            const cause = err instanceof Error ? err : new Error(String(err));
            throw timedOut
                ? new HttpError(
                      `Request timed out after ${timeout}ms`,
                      url,
                      0,
                      undefined,
                      "ETIMEDOUT",
                      cause,
                  )
                : new HttpError(cause.message, url, 0, undefined, "ENETWORK", cause);
        } finally {
            clearTimeout(timeoutId);
        }

        const text = await response.text();
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
