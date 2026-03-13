/**
 * Error thrown when an HTTP API request fails with a non-404 status.
 * Preserves the HTTP status code and response body for caller inspection.
 */
export class APIRequestFailure extends Error {
    public readonly status: number;
    public readonly body: string;

    constructor(protocol: string, status: number, body: string) {
        super(`${protocol} API request failed with status ${status}: ${body}`);
        this.name = "APIRequestFailure";
        this.status = status;
        this.body = body;
    }
}
