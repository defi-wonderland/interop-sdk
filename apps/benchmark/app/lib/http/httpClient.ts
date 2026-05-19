import {
  HttpError,
  HttpNetworkError,
  HttpTimeout,
  type HttpClient,
  type HttpClientConfig,
  type HttpRequestOptions,
  type HttpResponse,
} from '@wonderland/interop-cross-chain';

export interface FetchHttpClientConfig extends HttpClientConfig {
  retries?: number;
  retryDelayMs?: number;
}

const DEFAULT_RETRIES = 2;
const DEFAULT_RETRY_DELAY_MS = 300;

export class FetchHttpClient implements HttpClient {
  private readonly retries: number;
  private readonly retryDelayMs: number;

  constructor(private readonly config: FetchHttpClientConfig = {}) {
    this.retries = config.retries ?? DEFAULT_RETRIES;
    this.retryDelayMs = config.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS;
  }

  get<T = unknown>(path: string, options?: Omit<HttpRequestOptions, 'method' | 'body'>): Promise<HttpResponse<T>> {
    return this.request<T>(path, { ...options, method: 'GET' });
  }

  post<T = unknown>(
    path: string,
    body?: object,
    options?: Omit<HttpRequestOptions, 'method' | 'body'>,
  ): Promise<HttpResponse<T>> {
    return this.request<T>(path, { ...options, method: 'POST', body });
  }

  request<T = unknown>(path: string, options: HttpRequestOptions = {}): Promise<HttpResponse<T>> {
    const method = options.method ?? 'GET';
    const send = (): Promise<HttpResponse<T>> => this.send<T>(path, options);
    return isIdempotent(method) ? this.withRetries(send) : send();
  }

  private async send<T>(path: string, options: HttpRequestOptions): Promise<HttpResponse<T>> {
    const url = this.buildUrl(path, options.params);
    const timeout = options.timeout ?? this.config.timeout;
    const timer = this.startTimeout(timeout);
    const init: RequestInit = { ...this.buildRequestInit(options), signal: timer.signal };

    let response: Response;
    let text: string;
    try {
      response = await fetch(url, init);
      text = await response.text();
    } catch (cause) {
      throw this.wrapTransportError(cause, url, timer.timedOut, timeout);
    } finally {
      timer.clear();
    }

    return this.buildResponse<T>(response, text, url);
  }

  private async withRetries<T>(operation: () => Promise<HttpResponse<T>>): Promise<HttpResponse<T>> {
    let attempt = 0;
    while (true) {
      try {
        return await operation();
      } catch (error) {
        if (attempt >= this.retries || !isRetryable(error)) throw error;
        await sleep(this.retryDelayMs * 2 ** attempt);
        attempt++;
      }
    }
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
    const base = baseURL && !baseURL.endsWith('/') ? `${baseURL}/` : baseURL;
    const resolvedPath = base ? path.replace(/^\//, '') : path;
    return new URL(resolvedPath, base);
  }

  private buildRequestInit(options: HttpRequestOptions): Omit<RequestInit, 'signal'> {
    const hasBody = options.body != null;
    return {
      method: options.method ?? 'GET',
      headers: {
        Accept: 'application/json',
        ...(hasBody && { 'Content-Type': 'application/json' }),
        ...this.config.headers,
        ...options.headers,
      },
      body: hasBody ? JSON.stringify(options.body) : undefined,
    };
  }

  private startTimeout(timeout: number | undefined): TimeoutHandle {
    const controller = new AbortController();
    const handle: TimeoutHandle = { signal: controller.signal, timedOut: false, clear: () => {} };
    if (timeout != null) {
      const id = setTimeout(() => {
        handle.timedOut = true;
        controller.abort();
      }, timeout);
      handle.clear = (): void => clearTimeout(id);
    }
    return handle;
  }

  private wrapTransportError(cause: unknown, url: string, timedOut: boolean, timeout: number | undefined): HttpError {
    const wrapped = cause instanceof Error ? cause : new Error(String(cause));
    return timedOut ? new HttpTimeout(url, timeout ?? 0, wrapped) : new HttpNetworkError(wrapped.message, url, wrapped);
  }

  private buildResponse<T>(response: Response, text: string, url: string): HttpResponse<T> {
    const data = parseBody(text);
    if (!response.ok) {
      throw new HttpError(`Request failed with status ${response.status}`, url, response.status, data);
    }
    return { status: response.status, data: data as T, headers: response.headers };
  }
}

interface TimeoutHandle {
  signal: AbortSignal;
  timedOut: boolean;
  clear: () => void;
}

function isRetryable(error: unknown): boolean {
  if (error instanceof HttpTimeout || error instanceof HttpNetworkError) return true;
  if (error instanceof HttpError) return error.status === 429 || error.status >= 500;
  return false;
}

function isIdempotent(method: string): boolean {
  return method === 'GET' || method === 'HEAD';
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseBody(text: string): unknown {
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
