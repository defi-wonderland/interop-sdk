type EventListener = (...args: never[]) => void;

/**
 * Runtime-agnostic typed event emitter.
 *
 * Covers the subset of the Node `EventEmitter` API used inside the SDK
 * (`on` / `once` / `off` / `emit`). Keeps the SDK free of `node:events`
 * so it runs in any bundler without polyfills.
 *
 * Semantics match Node's defaults except that a listener registered
 * twice via {@link on} is deduplicated rather than fired twice.
 *
 * @typeParam EventMap - Map of event name to listener signature.
 */
export class TypedEventEmitter<EventMap extends Record<string, EventListener>> {
    private readonly listenersByEvent: Map<keyof EventMap, Set<EventListener>> = new Map();
    private readonly onceWrappers: WeakMap<object, EventListener> = new WeakMap();

    /**
     * Register `listener` to be called every time `event` is emitted.
     *
     * @returns The emitter instance, for chaining.
     */
    on<K extends keyof EventMap>(event: K, listener: EventMap[K]): this {
        let set = this.listenersByEvent.get(event);
        if (!set) {
            set = new Set();
            this.listenersByEvent.set(event, set);
        }
        set.add(listener as EventListener);
        return this;
    }

    /**
     * Register `listener` to be called the next time `event` is emitted, then removed.
     *
     * {@link off} called with the original `listener` after a `once` registration
     * will remove it, even before it fires.
     *
     * @returns The emitter instance, for chaining.
     */
    once<K extends keyof EventMap>(event: K, listener: EventMap[K]): this {
        const wrapper: EventListener = (...args) => {
            this.off(event, listener);
            (listener as EventListener)(...args);
        };
        this.onceWrappers.set(listener as unknown as object, wrapper);
        return this.on(event, wrapper as EventMap[K]);
    }

    /**
     * Remove a previously registered listener. Works for listeners registered
     * via {@link on} as well as {@link once}.
     *
     * @returns The emitter instance, for chaining.
     */
    off<K extends keyof EventMap>(event: K, listener: EventMap[K]): this {
        const set = this.listenersByEvent.get(event);
        if (!set) return this;

        const wrapper = this.onceWrappers.get(listener as unknown as object);
        set.delete((wrapper ?? listener) as EventListener);
        if (wrapper) {
            this.onceWrappers.delete(listener as unknown as object);
        }
        if (set.size === 0) {
            this.listenersByEvent.delete(event);
        }
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
        const set = this.listenersByEvent.get(event);
        if (!set || set.size === 0) return false;

        const snapshot = [...set];
        for (const listener of snapshot) {
            (listener as (...callArgs: Parameters<EventMap[K]>) => void)(...args);
        }
        return true;
    }
}
