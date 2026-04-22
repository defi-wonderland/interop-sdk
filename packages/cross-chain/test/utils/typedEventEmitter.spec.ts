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

        it("invokes the same listener once per registration when added multiple times", () => {
            const emitter = createEmitter();
            const listener = vi.fn();

            emitter.on("ping", listener);
            emitter.on("ping", listener);
            emitter.emit("ping", 42);

            expect(listener).toHaveBeenCalledTimes(2);
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

        it("forwards every positional argument to each listener", () => {
            type MultiEvents = { multi: (a: number, b: string, c: boolean) => void };
            const emitter = new TypedEventEmitter<MultiEvents>();
            const listener = vi.fn();

            emitter.on("multi", listener);
            emitter.emit("multi", 7, "hi", true);

            expect(listener).toHaveBeenCalledWith(7, "hi", true);
        });

        it("supports events with no arguments", () => {
            type VoidEvents = { tick: () => void };
            const emitter = new TypedEventEmitter<VoidEvents>();
            const listener = vi.fn();

            emitter.on("tick", listener);
            emitter.emit("tick");

            expect(listener).toHaveBeenCalledTimes(1);
            expect(listener).toHaveBeenCalledWith();
        });

        it("does not invoke listeners added during an emit in that same dispatch", () => {
            const emitter = createEmitter();
            const later = vi.fn();

            emitter.on("ping", () => emitter.on("ping", later));
            emitter.emit("ping", 1);
            expect(later).not.toHaveBeenCalled();

            emitter.emit("ping", 2);
            expect(later).toHaveBeenCalledTimes(1);
            expect(later).toHaveBeenCalledWith(2);
        });

        it("still invokes listeners captured by the snapshot when a prior listener removes them", () => {
            const emitter = createEmitter();
            const removable = vi.fn();

            emitter.on("ping", () => emitter.off("ping", removable));
            emitter.on("ping", removable);
            emitter.emit("ping", 1);

            expect(removable).toHaveBeenCalledTimes(1);
            expect(removable).toHaveBeenCalledWith(1);

            emitter.emit("ping", 2);
            expect(removable).toHaveBeenCalledTimes(1);
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

        it("is a no-op for an unregistered listener on a known event", () => {
            const emitter = createEmitter();
            const registered = vi.fn();
            const unregistered = vi.fn();

            emitter.on("ping", registered);
            emitter.off("ping", unregistered);
            emitter.emit("ping", 1);

            expect(registered).toHaveBeenCalledTimes(1);
            expect(unregistered).not.toHaveBeenCalled();
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

        it("fires each wrapper when once is registered twice with the same listener on the same event", () => {
            const emitter = createEmitter();
            const listener = vi.fn();

            emitter.once("ping", listener);
            emitter.once("ping", listener);
            emitter.emit("ping", 1);

            expect(listener).toHaveBeenCalledTimes(2);
            expect(listener).toHaveBeenNthCalledWith(1, 1);
            expect(listener).toHaveBeenNthCalledWith(2, 1);

            listener.mockClear();
            emitter.emit("ping", 2);
            expect(listener).not.toHaveBeenCalled();
        });

        it("tracks once registrations independently across events", () => {
            const emitter = createEmitter();
            const listener = vi.fn();

            emitter.once("ping", listener as TestEvents["ping"]);
            emitter.once("error", listener as TestEvents["error"]);

            emitter.emit("ping", 1);
            expect(listener).toHaveBeenCalledTimes(1);
            expect(listener).toHaveBeenLastCalledWith(1);

            const err = new Error("boom");
            emitter.emit("error", err);
            expect(listener).toHaveBeenCalledTimes(2);
            expect(listener).toHaveBeenLastCalledWith(err);
        });

        it("removes the on-listener of a different event when the same function is also once-registered", () => {
            const emitter = createEmitter();
            const shared = vi.fn();

            emitter.once("ping", shared as TestEvents["ping"]);
            emitter.on("error", shared as TestEvents["error"]);
            emitter.off("error", shared as TestEvents["error"]);

            const err = new Error("boom");
            emitter.emit("error", err);
            expect(shared).not.toHaveBeenCalled();

            emitter.emit("ping", 42);
            expect(shared).toHaveBeenCalledTimes(1);
            expect(shared).toHaveBeenCalledWith(42);
        });

        it("keeps the on-listener when the same function is also once-registered on the same event", () => {
            const emitter = createEmitter();
            const listener = vi.fn();

            emitter.on("ping", listener);
            emitter.once("ping", listener);
            emitter.emit("ping", 1);
            expect(listener).toHaveBeenCalledTimes(2);

            listener.mockClear();
            emitter.emit("ping", 2);
            expect(listener).toHaveBeenCalledTimes(1);
            expect(listener).toHaveBeenCalledWith(2);
        });

        it("removes a single once wrapper per off call when multiple share the same listener", () => {
            const emitter = createEmitter();
            const listener = vi.fn();

            emitter.once("ping", listener);
            emitter.once("ping", listener);
            emitter.off("ping", listener);
            emitter.emit("ping", 1);

            expect(listener).toHaveBeenCalledTimes(1);
            expect(listener).toHaveBeenCalledWith(1);

            listener.mockClear();
            emitter.emit("ping", 2);
            expect(listener).not.toHaveBeenCalled();
        });
    });
});
