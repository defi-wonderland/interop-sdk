/** Successful HTTP response returned by `HttpClient` and `httpRequest`. */
export interface HttpResponse<T = unknown> {
    status: number;
    data: T;
    headers: Headers;
}

/** Per-request options shared by `httpRequest` and `HttpClient` methods. */
export interface HttpRequestOptions {
    method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    headers?: Record<string, string>;
    /** Objects are JSON-serialized and `Content-Type: application/json` is set. Strings are sent as-is. */
    body?: unknown;
    /** Appended to the URL via `URLSearchParams`. Values are stringified; `null`/`undefined` are skipped. */
    params?: Record<string, unknown>;
    /** Aborts and throws `HttpTimeout` after this many ms. */
    timeout?: number;
    signal?: AbortSignal;
}

/** Configuration for an `HttpClient` instance. */
export interface HttpClientConfig {
    baseURL?: string;
    headers?: Record<string, string>;
    timeout?: number;
}
