/**
 * Framework entry point.
 * Re-export core primitives for app-layer usage.
 *
 * Usage:
 * ```ts
 * import { createStore, shallowEqual, Component } from "./ui/framework";
 * ```
 */
export * from "./store";
export * from "./selectors";
export * from "./component";
export * from "./dom";
export * from "./events";
