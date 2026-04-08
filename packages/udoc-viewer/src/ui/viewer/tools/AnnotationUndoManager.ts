/**
 * AnnotationUndoManager — tracks annotation edits and provides undo/redo.
 *
 * Uses per-page annotation array snapshots. Since the reducer produces new array
 * references on every change, snapshots are cheap (shared Annotation objects).
 *
 * The manager subscribes to the store's effect phase. When it detects that
 * `pageAnnotations` changed for a page that is newly dirty, it captures an
 * undo entry. During its own undo/redo replays, capturing is suppressed.
 *
 * Rapid successive changes to the same page (e.g. dragging to move) are
 * coalesced into a single undo entry using a time threshold.
 */

import type { Store } from "../../framework/store";
import type { ViewerState } from "../state";
import type { Action } from "../actions";
import type { Annotation } from "../annotation/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface UndoEntry {
    pageIndex: number;
    before: Annotation[];
    after: Annotation[];
    timestamp: number;
}

export interface AnnotationUndoManager {
    undo(): void;
    redo(): void;
    canUndo(): boolean;
    canRedo(): boolean;
    /** Subscribe to changes in canUndo/canRedo state. Returns unsubscribe function. */
    subscribe(fn: () => void): () => void;
    /** Clear both stacks (e.g. on document switch). */
    clear(): void;
    destroy(): void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Maximum number of undo steps to keep. */
const MAX_UNDO_DEPTH = 50;

/** Time window (ms) within which same-page changes are coalesced. */
const COALESCE_MS = 300;

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createAnnotationUndoManager(store: Store<ViewerState, Action>): AnnotationUndoManager {
    const undoStack: UndoEntry[] = [];
    const redoStack: UndoEntry[] = [];
    const listeners = new Set<() => void>();

    /** When true, the effect subscriber skips capturing. */
    let isApplying = false;

    /** Previous canUndo/canRedo state — used to decide whether to notify. */
    let prevCanUndo = false;
    let prevCanRedo = false;

    function notifyIfChanged(): void {
        const cu = undoStack.length > 0;
        const cr = redoStack.length > 0;
        if (cu !== prevCanUndo || cr !== prevCanRedo) {
            prevCanUndo = cu;
            prevCanRedo = cr;
            for (const fn of listeners) fn();
        }
    }

    // Subscribe to store changes
    const unsub = store.subscribeEffect((prev, next) => {
        // Skip capturing when this is our own undo/redo dispatch.
        // The flag must be reset here (not after dispatch) because the store
        // uses batched microtask notifications — the effect fires asynchronously.
        if (isApplying) {
            isApplying = false;
            return;
        }

        // Clear stacks on document switch or annotation clear
        if (prev.doc !== next.doc || (prev.pageAnnotations.size > 0 && next.pageAnnotations.size === 0)) {
            if (undoStack.length > 0 || redoStack.length > 0) {
                undoStack.length = 0;
                redoStack.length = 0;
                notifyIfChanged();
            }
            return;
        }

        // Detect which pages changed due to user annotation edits
        if (prev.pageAnnotations === next.pageAnnotations) return;

        const now = Date.now();

        for (const [pageIndex, nextList] of next.pageAnnotations) {
            const prevList = prev.pageAnnotations.get(pageIndex);
            if (prevList === nextList) continue;
            // Only capture if this page is dirty (user edit, not initial load)
            if (!next.annotationsDirtyPages.has(pageIndex)) continue;

            const before = prevList ?? [];
            const after = nextList;

            // Coalesce with the last entry if same page within the time window
            const last = undoStack.length > 0 ? undoStack[undoStack.length - 1] : null;
            if (last && last.pageIndex === pageIndex && now - last.timestamp < COALESCE_MS) {
                last.after = after;
                last.timestamp = now;
            } else {
                undoStack.push({ pageIndex, before, after, timestamp: now });
                if (undoStack.length > MAX_UNDO_DEPTH) {
                    undoStack.shift();
                }
            }

            // Any new user edit invalidates the redo stack
            redoStack.length = 0;
        }

        notifyIfChanged();
    });

    function undo(): void {
        if (undoStack.length === 0) return;
        const entry = undoStack.pop()!;
        redoStack.push(entry);

        isApplying = true;
        store.dispatch({
            type: "RESTORE_PAGE_ANNOTATIONS",
            pageIndex: entry.pageIndex,
            annotations: entry.before,
        });
        // isApplying is reset by the effect subscriber (runs in next microtask)

        notifyIfChanged();
    }

    function redo(): void {
        if (redoStack.length === 0) return;
        const entry = redoStack.pop()!;
        undoStack.push(entry);

        isApplying = true;
        store.dispatch({
            type: "RESTORE_PAGE_ANNOTATIONS",
            pageIndex: entry.pageIndex,
            annotations: entry.after,
        });
        // isApplying is reset by the effect subscriber (runs in next microtask)

        notifyIfChanged();
    }

    function clear(): void {
        undoStack.length = 0;
        redoStack.length = 0;
        notifyIfChanged();
    }

    function subscribe(fn: () => void): () => void {
        listeners.add(fn);
        return () => listeners.delete(fn);
    }

    function destroy(): void {
        unsub();
        listeners.clear();
        undoStack.length = 0;
        redoStack.length = 0;
    }

    return {
        undo,
        redo,
        canUndo: () => undoStack.length > 0,
        canRedo: () => redoStack.length > 0,
        subscribe,
        clear,
        destroy,
    };
}
