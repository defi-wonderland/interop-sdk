import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { HttpError } from "../../src/core/errors/HttpError.exception.js";
import { HttpNetworkError } from "../../src/core/errors/HttpNetworkError.exception.js";
import { HttpTimeout } from "../../src/core/errors/HttpTimeout.exception.js";
import { FetchHttpClient, httpRequest } from "../../src/core/utils/httpClient.js";

function jsonResponse(body: unknown, init: ResponseInit = { status: 200 }): Response {
    return new Response(JSON.stringify(body), {
        ...init,
        headers: { "content-type": "application/json", ...(init.headers ?? {}) },
    });
}

function rejection(p: Promise<unknown>): Promise<HttpError> {
    return p.then(
        () => Promise.reject(new Error("Expected promise to reject")),
        (e: HttpError) => e,
    );
}

function lastFetchInit(mock: ReturnType<typeof vi.fn>): RequestInit {
    return mock.mock.calls[0]![1] as RequestInit;
}

describe("httpClient", () => {
    const fetchMock = vi.fn<typeof fetch>();

    beforeEach(() => {
        vi.stubGlobal("fetch", fetchMock);
        fetchMock.mockReset();
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    describe("HttpError hierarchy", () => {
        it("captures fields and exposes subclasses for timeout/network", () => {
            const err = new HttpError("boom", "https://api.test/x", 503, { msg: "bad" });
            expect(err).toBeInstanceOf(Error);
            expect(err.name).toBe("HttpError");
            expect(err.status).toBe(503);
            expect(err.data).toEqual({ msg: "bad" });

            const t = new HttpTimeout("https://api.test/x", 100);
            expect(t).toBeInstanceOf(HttpError);
            expect(t.status).toBe(0);
            expect(t.message).toMatch(/100ms/);

            const n = new HttpNetworkError("offline", "https://api.test/x");
            expect(n).toBeInstanceOf(HttpError);
            expect(n.status).toBe(0);
        });
    });

    describe("URL building", () => {
        it("joins baseURL and path", async () => {
            fetchMock.mockResolvedValueOnce(jsonResponse({}));
            await new FetchHttpClient({ baseURL: "https://api.test" }).get("/v1/x");
            expect(fetchMock).toHaveBeenCalledWith("https://api.test/v1/x", expect.anything());
        });

        it("treats absolute URLs as-is, ignoring baseURL", async () => {
            fetchMock.mockResolvedValueOnce(jsonResponse({}));
            await new FetchHttpClient({ baseURL: "https://wrong.test" }).get(
                "https://right.test/path",
            );
            expect(fetchMock).toHaveBeenCalledWith("https://right.test/path", expect.anything());
        });

        it("appends params and skips null/undefined", async () => {
            fetchMock.mockResolvedValueOnce(jsonResponse({}));
            await httpRequest("https://api.test/q", {
                params: { a: "1", b: 2, skip: undefined, nope: null, flag: true },
            });

            const url = new URL(fetchMock.mock.calls[0]![0] as string);
            expect(url.searchParams.get("a")).toBe("1");
            expect(url.searchParams.get("b")).toBe("2");
            expect(url.searchParams.get("flag")).toBe("true");
            expect(url.searchParams.has("skip")).toBe(false);
            expect(url.searchParams.has("nope")).toBe(false);
        });
    });

    describe("body and headers", () => {
        it("serializes object body as JSON and sets Content-Type", async () => {
            fetchMock.mockResolvedValueOnce(jsonResponse({}));
            await httpRequest("https://api.test/x", { method: "POST", body: { hello: "world" } });

            const init = lastFetchInit(fetchMock);
            expect(init.method).toBe("POST");
            expect(init.body).toBe(JSON.stringify({ hello: "world" }));
            expect((init.headers as Record<string, string>)["Content-Type"]).toBe(
                "application/json",
            );
        });

        it("merges client and per-request headers, request wins", async () => {
            fetchMock.mockResolvedValueOnce(jsonResponse({}));
            await new FetchHttpClient({
                headers: { "x-shared": "yes", "x-override": "client" },
            }).get("https://api.test/x", { headers: { "x-override": "request" } });

            const headers = lastFetchInit(fetchMock).headers as Record<string, string>;
            expect(headers["x-shared"]).toBe("yes");
            expect(headers["x-override"]).toBe("request");
        });
    });

    describe("response handling", () => {
        it("returns parsed JSON on 2xx", async () => {
            fetchMock.mockResolvedValueOnce(jsonResponse({ ok: 1 }, { status: 201 }));
            const res = await httpRequest<{ ok: number }>("https://api.test/x");
            expect(res.status).toBe(201);
            expect(res.data).toEqual({ ok: 1 });
        });

        it("returns undefined when body is empty", async () => {
            fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
            const res = await httpRequest("https://api.test/x");
            expect(res.data).toBeUndefined();
        });

        it("returns raw text when body is not JSON", async () => {
            fetchMock.mockResolvedValueOnce(new Response("hello world", { status: 200 }));
            const res = await httpRequest("https://api.test/x");
            expect(res.data).toBe("hello world");
        });

        it("throws HttpError with status and parsed data on 4xx/5xx", async () => {
            fetchMock.mockResolvedValueOnce(jsonResponse({ message: "nope" }, { status: 400 }));
            const err = await rejection(httpRequest("https://api.test/x"));
            expect(err).toBeInstanceOf(HttpError);
            expect(err.status).toBe(400);
            expect(err.data).toEqual({ message: "nope" });
        });
    });

    describe("network and timeout", () => {
        it("wraps fetch failures as HttpNetworkError", async () => {
            fetchMock.mockRejectedValueOnce(new Error("getaddrinfo ENOTFOUND"));
            const err = await rejection(httpRequest("https://api.test/x"));
            expect(err).toBeInstanceOf(HttpNetworkError);
            expect(err.message).toMatch(/ENOTFOUND/);
        });

        it("wraps body read failures as HttpNetworkError", async () => {
            const broken = new Response(null);
            Object.defineProperty(broken, "text", {
                value: () => Promise.reject(new Error("body read failed")),
            });
            fetchMock.mockResolvedValueOnce(broken);

            const err = await rejection(httpRequest("https://api.test/x"));
            expect(err).toBeInstanceOf(HttpNetworkError);
            expect(err.message).toMatch(/body read failed/);
        });

        it("throws HttpTimeout when the configured timeout elapses", async () => {
            vi.useFakeTimers();
            fetchMock.mockImplementationOnce(
                (_url, init) =>
                    new Promise((_, reject) => {
                        (init as RequestInit).signal?.addEventListener("abort", () =>
                            reject(new Error("aborted")),
                        );
                    }),
            );

            const promise = httpRequest("https://api.test/x", { timeout: 100 });
            vi.advanceTimersByTime(150);

            const err = await rejection(promise);
            expect(err).toBeInstanceOf(HttpTimeout);
            expect(err.message).toMatch(/100ms/);

            vi.useRealTimers();
        });
    });
});
