import { HttpError } from "./HttpError.exception.js";

/** Thrown when fetch fails to produce a response (DNS, connection refused, body read failure, etc.). */
export class HttpNetworkError extends HttpError {
    override readonly name = "HttpNetworkError";

    constructor(message: string, url: string, cause?: unknown) {
        super(message, url, 0, undefined, cause);
    }
}
