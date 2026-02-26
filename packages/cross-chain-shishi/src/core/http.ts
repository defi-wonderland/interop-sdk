export interface HttpRequestOptions {
  headers?: Record<string, string>;
  params?: Record<string, string | number>;
  timeoutMs?: number;
}

export interface HttpResponse<T = unknown> {
  status: number;
  data: T;
}

export interface HttpClient {
  get<T = unknown>(path: string, options?: HttpRequestOptions): Promise<HttpResponse<T>>;
  post<T = unknown>(path: string, body?: unknown, options?: HttpRequestOptions): Promise<HttpResponse<T>>;
}

export interface HttpClientConfig {
  baseUrl: string;
  headers?: Record<string, string>;
  timeoutMs?: number;
}

/**
 * Creates an HttpClient wrapping the underlying HTTP library (axios, fetch, etc.).
 * All protocol clients receive this instead of importing axios directly.
 */
export function createHttpClient(_config: HttpClientConfig): HttpClient {
  throw new Error("Not implemented");
}
