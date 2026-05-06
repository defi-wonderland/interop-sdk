/**
 * Thrown by `HttpClient` / `httpRequest` for any non-2xx response or transport failure.
 *
 * Subclasses ({@link HttpTimeout}, {@link HttpNetworkError}) cover the no-response cases.
 * Plain `HttpError` is thrown when the server responded but the status was not 2xx.
 */
export class HttpError extends Error {
    override readonly name: string = "HttpError";

    constructor(
        message: string,
        /** Final URL that was requested. */
        readonly url: string,
        /** HTTP status. `0` when no response was received (subclasses use this). */
        readonly status: number,
        /** Parsed response body (JSON value, raw text, or `undefined` when empty). */
        readonly data: unknown,
        override readonly cause?: unknown,
    ) {
        super(message);
    }
}
