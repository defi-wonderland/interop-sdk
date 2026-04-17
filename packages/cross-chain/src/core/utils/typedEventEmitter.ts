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
    private readonly onceWrapperToListener: WeakMap<EventListener, EventListener> = new WeakMap();

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
     * will remove it, even before it fires. Multiple `once` registrations of the
     * same listener — on the same or different events — are tracked independently.
     *
     * @returns The emitter instance, for chaining.
     */
    once<K extends keyof EventMap>(event: K, listener: EventMap[K]): this {
        const wrapper: EventListener = (...args) => {
            const current = this.listenersByEvent.get(event);
            if (current) {
                current.delete(wrapper);
                if (current.size === 0) this.listenersByEvent.delete(event);
            }
            (listener as EventListener)(...args);
        };
        this.onceWrapperToListener.set(wrapper, listener as EventListener);
        return this.on(event, wrapper as EventMap[K]);
    }

    /**
     * Remove every registration of `listener` for `event`. Removes both direct
     * {@link on} listeners and any pending {@link once} wrapper(s) for the pair
     * `(event, listener)`, without touching registrations bound to other events.
     *
     * @returns The emitter instance, for chaining.
     */
    off<K extends keyof EventMap>(event: K, listener: EventMap[K]): this {
        const set = this.listenersByEvent.get(event);
        if (!set) return this;

        const target = listener as EventListener;
        for (const registered of [...set]) {
            if (registered === target || this.onceWrapperToListener.get(registered) === target) {
                set.delete(registered);
            }
        }
        if (set.size === 0) this.listenersByEvent.delete(event);
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
