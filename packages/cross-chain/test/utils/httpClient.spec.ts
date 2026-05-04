import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { HttpClient, HttpError, httpRequest } from "../../src/core/utils/httpClient.js";

function jsonResponse(body: unknown, init: ResponseInit = { status: 200 }): Response {
    return new Response(JSON.stringify(body), {
        ...init,
        headers: { "content-type": "application/json", ...(init.headers ?? {}) },
    });
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

    describe("HttpError", () => {
        it("captures all fields and is catchable as Error", () => {
            const cause = new Error("inner");
            const err = new HttpError(
                "boom",
                "https://api.test/x",
                503,
                { msg: "bad" },
                undefined,
                cause,
            );

            expect(err).toBeInstanceOf(Error);
            expect(err).toBeInstanceOf(HttpError);
            expect(err.name).toBe("HttpError");
            expect(err.message).toBe("boom");
            expect(err.url).toBe("https://api.test/x");
            expect(err.status).toBe(503);
            expect(err.data).toEqual({ msg: "bad" });
            expect(err.cause).toBe(cause);
        });
    });

    describe("URL building", () => {
        it("joins baseURL and path", async () => {
            fetchMock.mockResolvedValueOnce(jsonResponse({}));
            await new HttpClient({ baseURL: "https://api.test" }).get("/v1/x");

            expect(fetchMock).toHaveBeenCalledWith("https://api.test/v1/x", expect.anything());
        });

        it("treats absolute URLs as-is, ignoring baseURL", async () => {
            fetchMock.mockResolvedValueOnce(jsonResponse({}));
            await new HttpClient({ baseURL: "https://wrong.test" }).get("https://right.test/path");

            expect(fetchMock).toHaveBeenCalledWith("https://right.test/path", expect.anything());
        });

        it("appends params and skips null/undefined", async () => {
            fetchMock.mockResolvedValueOnce(jsonResponse({}));
            await httpRequest("https://api.test/q", {
                params: { a: "1", b: 2, skip: undefined, nope: null, flag: true },
            });

            const url = new URL(fetchMock.mock.calls[0]![0] as string);
            expect(url.pathname).toBe("/q");
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

            const init = fetchMock.mock.calls[0]![1] as RequestInit;
            expect(init.body).toBe(JSON.stringify({ hello: "world" }));
            expect((init.headers as Record<string, string>)["Content-Type"]).toBe(
                "application/json",
            );
        });

        it("sends string body verbatim and does not set Content-Type", async () => {
            fetchMock.mockResolvedValueOnce(jsonResponse({}));
            await httpRequest("https://api.test/x", { method: "POST", body: "raw" });

            const init = fetchMock.mock.calls[0]![1] as RequestInit;
            expect(init.body).toBe("raw");
            expect((init.headers as Record<string, string>)["Content-Type"]).toBeUndefined();
        });

        it("merges client and per-request headers, request wins", async () => {
            fetchMock.mockResolvedValueOnce(jsonResponse({}));
            const client = new HttpClient({
                headers: { "x-shared": "yes", "x-override": "client" },
            });
            await client.get("https://api.test/x", { headers: { "x-override": "request" } });

            const headers = (fetchMock.mock.calls[0]![1] as RequestInit).headers as Record<
                string,
                string
            >;
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

        it("returns undefined data when body is empty", async () => {
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

            const err = await httpRequest("https://api.test/x").catch((e: HttpError) => e);
            expect(err).toBeInstanceOf(HttpError);
            expect((err as HttpError).status).toBe(400);
            expect((err as HttpError).data).toEqual({ message: "nope" });
        });
    });

    describe("network and timeout", () => {
        it("wraps fetch failures as HttpError with code ENETWORK", async () => {
            fetchMock.mockRejectedValueOnce(new Error("getaddrinfo ENOTFOUND"));

            const err = await httpRequest("https://api.test/x").catch((e: HttpError) => e);
            expect(err).toBeInstanceOf(HttpError);
            expect((err as HttpError).status).toBe(0);
            expect((err as HttpError).code).toBe("ENETWORK");
            expect((err as HttpError).message).toMatch(/ENOTFOUND/);
        });

        it("wraps body read failures as HttpError", async () => {
            const broken = new Response(null);
            Object.defineProperty(broken, "text", {
                value: () => Promise.reject(new Error("body read failed")),
            });
            fetchMock.mockResolvedValueOnce(broken);

            const err = await httpRequest("https://api.test/x").catch((e: HttpError) => e);
            expect(err).toBeInstanceOf(HttpError);
            expect((err as HttpError).code).toBe("ENETWORK");
            expect((err as HttpError).message).toMatch(/body read failed/);
        });

        it("aborts and throws ETIMEDOUT after the configured timeout", async () => {
            vi.useFakeTimers();

            fetchMock.mockImplementationOnce(
                (_url, init) =>
                    new Promise((_, reject) => {
                        const signal = (init as RequestInit).signal as AbortSignal | undefined;
                        signal?.addEventListener("abort", () => reject(new Error("aborted")));
                    }),
            );

            const promise = httpRequest("https://api.test/x", { timeout: 100 });
            vi.advanceTimersByTime(150);

            const err = await promise.catch((e: HttpError) => e);
            expect(err).toBeInstanceOf(HttpError);
            expect((err as HttpError).code).toBe("ETIMEDOUT");
            expect((err as HttpError).message).toMatch(/100ms/);

            vi.useRealTimers();
        });

        it("forwards external AbortSignal", async () => {
            const externalController = new AbortController();
            fetchMock.mockImplementationOnce(
                (_url, init) =>
                    new Promise((_, reject) => {
                        const signal = (init as RequestInit).signal as AbortSignal | undefined;
                        signal?.addEventListener("abort", () => reject(new Error("aborted")));
                    }),
            );

            const promise = httpRequest("https://api.test/x", {
                signal: externalController.signal,
            });
            externalController.abort();

            const err = await promise.catch((e: HttpError) => e);
            expect(err).toBeInstanceOf(HttpError);
            expect((err as HttpError).code).toBe("ENETWORK");
        });
    });

    describe("HttpClient method shortcuts", () => {
        it("get sends GET", async () => {
            fetchMock.mockResolvedValueOnce(jsonResponse({}));
            await new HttpClient().get("https://api.test/x");

            expect((fetchMock.mock.calls[0]![1] as RequestInit).method).toBe("GET");
        });

        it("post sends POST with the provided body", async () => {
            fetchMock.mockResolvedValueOnce(jsonResponse({}));
            await new HttpClient().post("https://api.test/x", { a: 1 });

            const init = fetchMock.mock.calls[0]![1] as RequestInit;
            expect(init.method).toBe("POST");
            expect(init.body).toBe(JSON.stringify({ a: 1 }));
        });
    });
});
