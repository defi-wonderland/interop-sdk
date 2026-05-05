import { HttpError } from "./HttpError.exception.js";

/** Thrown when a request is aborted because its configured `timeout` elapsed. */
export class HttpTimeout extends HttpError {
    override readonly name = "HttpTimeout";

    constructor(url: string, timeoutMs: number, cause?: unknown) {
        super(`Request timed out after ${timeoutMs}ms`, url, 0, undefined, cause);
    }
}
