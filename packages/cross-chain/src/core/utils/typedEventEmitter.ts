type EventListener = (...args: never[]) => void;
type OnceWrapper = EventListener & { listener: EventListener };

/**
 * Runtime-agnostic typed event emitter.
 *
 * Covers the subset of the Node `EventEmitter` API used inside the SDK
 * (`on` / `once` / `off` / `emit`). Keeps the SDK free of `node:events`
 * so it runs in any bundler without polyfills, matching Node's semantics:
 *
 * - Listeners fire in registration order.
 * - {@link on} does not deduplicate: the same listener registered N times
 *   fires N times per emit.
 * - {@link off} removes one registration per call — the most recently
 *   registered match for that event, scanning from the end, checking both
 *   the listener itself and any `once` wrapper's original listener.
 *
 * Dispatch uses a snapshot of the listener list, so listeners added during
 * an `emit` do not run in that same dispatch, and listeners captured by
 * the snapshot still run even if another listener removes them mid-dispatch.
 *
 * @typeParam EventMap - Map of event name to listener signature.
 */
export class TypedEventEmitter<EventMap extends Record<string, EventListener>> {
    private readonly listenersByEvent: Map<keyof EventMap, EventListener[]> = new Map();

    /**
     * Register `listener` to be called every time `event` is emitted.
     *
     * @returns The emitter instance, for chaining.
     */
    on<K extends keyof EventMap>(event: K, listener: EventMap[K]): this {
        let list = this.listenersByEvent.get(event);
        if (!list) {
            list = [];
            this.listenersByEvent.set(event, list);
        }
        list.push(listener as EventListener);
        return this;
    }

    /**
     * Register `listener` to be called the next time `event` is emitted, then removed.
     *
     * {@link off} called with the original `listener` after a `once` registration
     * will remove one pending wrapper, even before it fires. Multiple `once`
     * registrations of the same listener — on the same or different events — are
     * tracked independently.
     *
     * @returns The emitter instance, for chaining.
     */
    once<K extends keyof EventMap>(event: K, listener: EventMap[K]): this {
        const wrapper: EventListener = (...args) => {
            this.off(event, wrapper as EventMap[K]);
            (listener as EventListener)(...args);
        };
        (wrapper as OnceWrapper).listener = listener as EventListener;
        return this.on(event, wrapper as EventMap[K]);
    }

    /**
     * Remove one registration of `listener` for `event`. Scans from the most
     * recently registered entry and removes the first match — either a direct
     * {@link on} entry or a pending {@link once} wrapper whose original
     * listener matches.
     *
     * @returns The emitter instance, for chaining.
     */
    off<K extends keyof EventMap>(event: K, listener: EventMap[K]): this {
        const list = this.listenersByEvent.get(event);
        if (!list) return this;

        const target = listener as EventListener;
        for (let i = list.length - 1; i >= 0; i--) {
            const entry = list[i];
            if (entry === target || (entry as Partial<OnceWrapper>).listener === target) {
                list.splice(i, 1);
                break;
            }
        }
        if (list.length === 0) this.listenersByEvent.delete(event);
        return this;
    }

    /**
     * Synchronously invoke all listeners registered for `event`.
     *
     * A throwing listener propagates the error synchronously and aborts
     * the remaining listeners for that call — same as Node's default.
     *
     * @returns `true` when at least one listener was invoked, `false` otherwise.
     */
    emit<K extends keyof EventMap>(event: K, ...args: Parameters<EventMap[K]>): boolean {
        const list = this.listenersByEvent.get(event);
        if (!list || list.length === 0) return false;

        for (const listener of [...list]) {
            (listener as (...callArgs: Parameters<EventMap[K]>) => void)(...args);
        }
        return true;
    }
}
