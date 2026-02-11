/**
 * Framework store: central event loop for state + subscriptions.
 *
 * Rules:
 * - Reducers must be pure and synchronous.
 * - Render subscribers update DOM only (no effects).
 * - Effect subscribers may do async work and may dispatch.
 * - Store does not know about viewer-specific state.
 *
 * Usage:
 * ```ts
 * const store = createStore(reducer, initialState, { batched: true });
 * const off = store.subscribeRender((_prev, next) => render(next));
 * store.dispatch({ type: "SET_PAGE", page: 2 });
 * off();
 * ```
 */
export type Reducer<S, A> = (state: S, action: A) => S;
export type Subscriber<S> = (prev: S, next: S) => void;

export interface Store<S, A> {
    /** Current state snapshot. */
    getState(): S;
    /** Dispatch an action to transition state via the reducer. */
    dispatch(action: A): void;
    /** Render-phase subscription (DOM only). */
    subscribeRender(fn: Subscriber<S>): () => void;
    /** Effect-phase subscription (async allowed). */
    subscribeEffect(fn: Subscriber<S>): () => void;
}

/**
 * Create a store with optional microtask batching for subscriber notifications.
 * Batching groups multiple dispatches into a single notify cycle.
 */
export function createStore<S, A>(
    reducer: Reducer<S, A>,
    initialState: S,
    options: { batched?: boolean } = {}
): Store<S, A> {
    let state = initialState;
    const renderSubs = new Set<Subscriber<S>>();
    const effectSubs = new Set<Subscriber<S>>();

    const batched = options.batched ?? true;
    let pending = false;
    let lastPrev: S | null = null;
    let lastNext: S | null = null;

    function notify(prev: S, next: S): void {
        for (const fn of renderSubs) fn(prev, next);
        for (const fn of effectSubs) fn(prev, next);
    }

    function scheduleNotify(prev: S, next: S): void {
        if (!batched) return notify(prev, next);
        lastPrev = lastPrev ?? prev;
        lastNext = next;
        if (pending) return;
        pending = true;
        queueMicrotask(() => {
            pending = false;
            const p = lastPrev as S;
            const n = lastNext as S;
            lastPrev = null;
            lastNext = null;
            notify(p, n);
        });
    }

    function dispatch(action: A): void {
        const prev = state;
        const next = reducer(prev, action);
        if (next === prev) return;
        state = next;
        scheduleNotify(prev, next);
    }

    function subscribeRender(fn: Subscriber<S>): () => void {
        renderSubs.add(fn);
        return () => renderSubs.delete(fn);
    }

    function subscribeEffect(fn: Subscriber<S>): () => void {
        effectSubs.add(fn);
        return () => effectSubs.delete(fn);
    }

    return { getState: () => state, dispatch, subscribeRender, subscribeEffect };
}
