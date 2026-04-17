import { describe, expect, it, vi } from "vitest";

import { TypedEventEmitter } from "../../src/core/utils/typedEventEmitter.js";

type TestEvents = {
    ping: (value: number) => void;
    error: (err: Error) => void;
};

function createEmitter(): TypedEventEmitter<TestEvents> {
    return new TypedEventEmitter<TestEvents>();
}

describe("TypedEventEmitter", () => {
    describe("on", () => {
        it("invokes the listener every time the event is emitted", () => {
            const emitter = createEmitter();
            const listener = vi.fn();

            emitter.on("ping", listener);
            emitter.emit("ping", 1);
            emitter.emit("ping", 2);

            expect(listener).toHaveBeenCalledTimes(2);
            expect(listener).toHaveBeenNthCalledWith(1, 1);
            expect(listener).toHaveBeenNthCalledWith(2, 2);
        });

        it("invokes multiple listeners in registration order", () => {
            const emitter = createEmitter();
            const calls: string[] = [];

            emitter.on("ping", () => calls.push("a"));
            emitter.on("ping", () => calls.push("b"));
            emitter.on("ping", () => calls.push("c"));
            emitter.emit("ping", 0);

            expect(calls).toEqual(["a", "b", "c"]);
        });

        it("deduplicates when the same listener is registered twice", () => {
            const emitter = createEmitter();
            const listener = vi.fn();

            emitter.on("ping", listener);
            emitter.on("ping", listener);
            emitter.emit("ping", 42);

            expect(listener).toHaveBeenCalledTimes(1);
        });

        it("returns the emitter instance for chaining", () => {
            const emitter = createEmitter();

            const result = emitter.on("ping", () => undefined).on("error", () => undefined);

            expect(result).toBe(emitter);
        });
    });

    describe("emit", () => {
        it("returns true when at least one listener was invoked", () => {
            const emitter = createEmitter();
            emitter.on("ping", () => undefined);

            expect(emitter.emit("ping", 1)).toBe(true);
        });

        it("returns false when no listeners are registered", () => {
            const emitter = createEmitter();

            expect(emitter.emit("ping", 1)).toBe(false);
        });

        it("returns false after the last listener is removed", () => {
            const emitter = createEmitter();
            const listener = vi.fn();

            emitter.on("ping", listener);
            emitter.off("ping", listener);

            expect(emitter.emit("ping", 1)).toBe(false);
            expect(listener).not.toHaveBeenCalled();
        });

        it("propagates listener errors synchronously and aborts remaining listeners", () => {
            const emitter = createEmitter();
            const failing = (): never => {
                throw new Error("boom");
            };
            const following = vi.fn();

            emitter.on("ping", failing);
            emitter.on("ping", following);

            expect(() => emitter.emit("ping", 1)).toThrow("boom");
            expect(following).not.toHaveBeenCalled();
        });
    });

    describe("off", () => {
        it("removes a listener registered via on", () => {
            const emitter = createEmitter();
            const listener = vi.fn();

            emitter.on("ping", listener);
            emitter.off("ping", listener);
            emitter.emit("ping", 1);

            expect(listener).not.toHaveBeenCalled();
        });

        it("is a no-op for an unknown event", () => {
            const emitter = createEmitter();

            expect(() => emitter.off("ping", () => undefined)).not.toThrow();
        });
    });

    describe("once", () => {
        it("fires exactly once and then auto-removes", () => {
            const emitter = createEmitter();
            const listener = vi.fn();

            emitter.once("ping", listener);
            emitter.emit("ping", 1);
            emitter.emit("ping", 2);

            expect(listener).toHaveBeenCalledTimes(1);
            expect(listener).toHaveBeenCalledWith(1);
        });

        it("removes the listener when off is called with the original reference before firing", () => {
            const emitter = createEmitter();
            const listener = vi.fn();

            emitter.once("ping", listener);
            emitter.off("ping", listener);
            emitter.emit("ping", 1);

            expect(listener).not.toHaveBeenCalled();
        });
    });
});
