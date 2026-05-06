/** Successful HTTP response returned by `HttpClient` implementations. */
export interface HttpResponse<T = unknown> {
    status: number;
    data: T;
    headers: Headers;
}

/** Per-request options shared by all `HttpClient` methods. */
export interface HttpRequestOptions {
    method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    headers?: Record<string, string>;
    /** JSON-serialized into the request body; `Content-Type: application/json` is set automatically. Only objects/arrays — primitives are rejected at compile time. */
    body?: object;
    /** Appended to the URL via `URLSearchParams`. Values are stringified; `null`/`undefined` are skipped. */
    params?: Record<string, unknown>;
    /** Aborts and throws `HttpTimeout` after this many ms. */
    timeout?: number;
}

/** Configuration for an `HttpClient` instance. */
export interface HttpClientConfig {
    baseURL?: string;
    headers?: Record<string, string>;
    timeout?: number;
}

/**
 * Contract for HTTP clients consumed by providers and services.
 * Depending on this interface lets the underlying transport be swapped or mocked
 * without touching call sites.
 */
export interface HttpClient {
    get<T = unknown>(
        path: string,
        options?: Omit<HttpRequestOptions, "method" | "body">,
    ): Promise<HttpResponse<T>>;

    post<T = unknown>(
        path: string,
        body?: object,
        options?: Omit<HttpRequestOptions, "method" | "body">,
    ): Promise<HttpResponse<T>>;

    request<T = unknown>(path: string, options?: HttpRequestOptions): Promise<HttpResponse<T>>;
}
