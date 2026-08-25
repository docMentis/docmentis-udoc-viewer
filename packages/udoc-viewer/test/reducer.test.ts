import { describe, it, expect } from "vitest";
import { reducer } from "../src/ui/viewer/reducer.js";
import { initialState } from "../src/ui/viewer/state.js";
import type { ViewerState } from "../src/ui/viewer/state.js";
import type { Annotation } from "../src/ui/viewer/annotation/types.js";

/** A single linear page group covering the whole document. */
const LINEAR_PAGE_GROUP = { startPageIndex: 0, pageCount: 3, layout: { type: "linear" } as const };

/** Build a minimal square annotation for the editing tests. */
function squareAnnotation(name: string, ephemeral = false): Annotation {
    const annotation: Annotation = {
        type: "square",
        bounds: { x: 10, y: 20, width: 100, height: 50 },
        color: { r: 1, g: 0, b: 0 },
        borderWidth: 2,
        name,
    };
    return ephemeral ? { ...annotation, ephemeral: true } : annotation;
}

/** Load a 3-page PDF document into the viewer state. */
function createLoadedState(): ViewerState {
    return reducer(initialState, {
        type: "SET_DOC",
        doc: { id: "doc-1" },
        documentFormat: "pdf",
        pageCount: 3,
        pageInfos: [
            { width: 612, height: 792 },
            { width: 612, height: 792 },
            { width: 612, height: 792 },
        ],
        pageGroups: [LINEAR_PAGE_GROUP],
    });
}

/** Load a document and seed page 0 with the given annotations. */
function createStateWithAnnotations(annotations: Annotation[]): ViewerState {
    return reducer(createLoadedState(), { type: "SET_PAGE_ANNOTATIONS", pageIndex: 0, annotations });
}

describe("reducer", () => {
    describe("SET_DOC", () => {
        it("should set document metadata and reset pagination", () => {
            const state = createLoadedState();
            expect(state.doc).toEqual({ id: "doc-1" });
            expect(state.documentFormat).toBe("pdf");
            expect(state.pageCount).toBe(3);
            expect(state.pageInfos).toHaveLength(3);
            expect(state.page).toBe(1);
            expect(state.pageGroups).toEqual([LINEAR_PAGE_GROUP]);
        });

        it("should apply view defaults when provided", () => {
            const state = reducer(initialState, {
                type: "SET_DOC",
                doc: { id: "doc-1" },
                documentFormat: "pdf",
                pageCount: 3,
                pageInfos: [{ width: 612, height: 792 }],
                pageGroups: [LINEAR_PAGE_GROUP],
                viewDefaults: { viewMode: "continuous", pageRotation: 90 },
            });
            expect(state.viewMode).toBe("continuous");
            expect(state.pageRotation).toBe(90);
        });

        it("should fall back to initial view defaults when not provided", () => {
            const state = createLoadedState();
            expect(state.viewMode).toBe(initialState.viewMode);
            expect(state.pageRotation).toBe(initialState.pageRotation);
        });

        it("should keep the active annotation tool when the format supports annotations", () => {
            let state = createLoadedState();
            state = reducer(state, { type: "SET_ACTIVE_TOOL", tool: { kind: "annotate", sub: "freehand" } });
            state = reducer(state, {
                type: "SET_DOC",
                doc: { id: "doc-2" },
                documentFormat: "pdf",
                pageCount: 2,
                pageInfos: [{ width: 612, height: 792 }],
                pageGroups: [LINEAR_PAGE_GROUP],
            });
            expect(state.activeTool).toEqual({ kind: "annotate", sub: "freehand" });
        });

        it("should downgrade an annotation tool when the format does not support annotations", () => {
            let state = createLoadedState();
            state = reducer(state, { type: "SET_ACTIVE_TOOL", tool: { kind: "annotate", sub: "freehand" } });
            state = reducer(state, {
                type: "SET_DOC",
                doc: { id: "doc-2" },
                documentFormat: "pptx",
                pageCount: 2,
                pageInfos: [{ width: 612, height: 792 }],
                pageGroups: [LINEAR_PAGE_GROUP],
            });
            expect(state.activeTool).toEqual({ kind: "pointer" });
        });
    });

    describe("CLEAR_DOC", () => {
        it("should reset document, annotations, and search state", () => {
            let state = createStateWithAnnotations([squareAnnotation("a1"), squareAnnotation("a2")]);
            state = reducer(state, { type: "SELECT_ANNOTATION", pageIndex: 0, annotationIndex: 0 });
            state = reducer(state, { type: "SET_SEARCH_QUERY", query: "hello" });

            const next = reducer(state, { type: "CLEAR_DOC" });

            expect(next.doc).toBeNull();
            expect(next.documentFormat).toBeNull();
            expect(next.pageCount).toBe(0);
            expect(next.pageAnnotations.size).toBe(0);
            expect(next.annotationsDirtyPages.size).toBe(0);
            expect(next.selectedAnnotation).toBeNull();
            expect(next.searchQuery).toBe("");
            expect(next.activePanel).toBeNull();
            expect(next.panelTransitionsDisabled).toBe(true);
        });

        it("should return the same state reference when no document is loaded", () => {
            const next = reducer(initialState, { type: "CLEAR_DOC" });
            expect(next).toBe(initialState);
        });
    });

    describe("SET_PAGE", () => {
        it("should clamp the page number to the document bounds", () => {
            const state = createLoadedState();
            expect(reducer(state, { type: "SET_PAGE", page: 10 }).page).toBe(3);
            expect(reducer(state, { type: "SET_PAGE", page: 0 }).page).toBe(1);
        });

        it("should clamp to page 1 when no document is loaded", () => {
            expect(reducer(initialState, { type: "SET_PAGE", page: 5 }).page).toBe(1);
        });

        it("should return the same state reference when the page does not change", () => {
            const state = reducer(createLoadedState(), { type: "SET_PAGE", page: 2 });
            const next = reducer(state, { type: "SET_PAGE", page: 2 });
            expect(next).toBe(state);
        });
    });

    describe("SET_ACTIVE_GROUP", () => {
        /** Two sheet groups over a 5-page document: [0-2] and [3-4]. */
        function createMultiGroupState(): ViewerState {
            return reducer(initialState, {
                type: "SET_DOC",
                doc: { id: "doc-1" },
                documentFormat: "xlsx",
                pageCount: 5,
                pageInfos: [{ width: 612, height: 792 }],
                pageGroups: [
                    { name: "Sheet1", startPageIndex: 0, pageCount: 3, layout: { type: "linear" } },
                    { name: "Sheet2", startPageIndex: 3, pageCount: 2, layout: { type: "linear" } },
                ],
            });
        }

        it("should switch to the group's first page", () => {
            const state = createMultiGroupState();
            const next = reducer(state, { type: "SET_ACTIVE_GROUP", groupIndex: 1 });
            expect(next.activeGroupIndex).toBe(1);
            expect(next.page).toBe(4);
        });

        it("should clamp out-of-range group indices", () => {
            const state = createMultiGroupState();
            const next = reducer(state, { type: "SET_ACTIVE_GROUP", groupIndex: 5 });
            expect(next.activeGroupIndex).toBe(1);
        });

        it("should return the same state reference when the group does not change", () => {
            const state = createMultiGroupState();
            const next = reducer(state, { type: "SET_ACTIVE_GROUP", groupIndex: 0 });
            expect(next).toBe(state);
        });
    });

    describe("SET_PERMIT_NOTICE", () => {
        it("should set, replace, and clear the notice", () => {
            const first = { title: "Quota reached", body: "Upgrade to continue rendering." };
            const second = { title: "Verification failed", body: "Could not verify the permit." };

            let state = reducer(createLoadedState(), { type: "SET_PERMIT_NOTICE", notice: first });
            expect(state.permitNotice).toEqual(first);

            state = reducer(state, { type: "SET_PERMIT_NOTICE", notice: second });
            expect(state.permitNotice).toEqual(second);

            state = reducer(state, { type: "SET_PERMIT_NOTICE", notice: null });
            expect(state.permitNotice).toBeNull();
        });
    });

    describe("ADD_ANNOTATION", () => {
        it("should append the annotation and mark the page dirty", () => {
            const state = createStateWithAnnotations([squareAnnotation("a1")]);
            const added = squareAnnotation("a2");

            const next = reducer(state, { type: "ADD_ANNOTATION", pageIndex: 0, annotation: added });

            expect(next.pageAnnotations.get(0)).toHaveLength(2);
            expect(next.pageAnnotations.get(0)?.[1]).toBe(added);
            expect(next.annotationsDirtyPages.has(0)).toBe(true);
        });

        it("should not mark the page dirty for ephemeral annotations", () => {
            const state = createStateWithAnnotations([squareAnnotation("a1")]);
            const next = reducer(state, {
                type: "ADD_ANNOTATION",
                pageIndex: 0,
                annotation: squareAnnotation("preview", true),
            });
            expect(next.pageAnnotations.get(0)).toHaveLength(2);
            expect(next.annotationsDirtyPages.size).toBe(0);
        });

        it("should create the page list when the page has no annotations yet", () => {
            const state = createLoadedState();
            const next = reducer(state, {
                type: "ADD_ANNOTATION",
                pageIndex: 2,
                annotation: squareAnnotation("a1"),
            });
            expect(next.pageAnnotations.get(2)).toHaveLength(1);
            expect(next.annotationsDirtyPages.has(2)).toBe(true);
        });

        it("should preserve annotations on other pages", () => {
            const state = createStateWithAnnotations([squareAnnotation("a1")]);
            const page0List = state.pageAnnotations.get(0);
            const next = reducer(state, {
                type: "ADD_ANNOTATION",
                pageIndex: 1,
                annotation: squareAnnotation("a2"),
            });
            expect(next.pageAnnotations.get(0)).toBe(page0List);
            expect(next.pageAnnotations.get(1)).toHaveLength(1);
        });
    });

    describe("ADD_ANNOTATIONS", () => {
        it("should append all annotations in order and mark the page dirty", () => {
            const state = createStateWithAnnotations([squareAnnotation("a1")]);
            const batch = [squareAnnotation("a2"), squareAnnotation("a3")];

            const next = reducer(state, { type: "ADD_ANNOTATIONS", pageIndex: 0, annotations: batch });

            const list = next.pageAnnotations.get(0)!;
            expect(list).toHaveLength(3);
            expect(list[1]).toBe(batch[0]);
            expect(list[2]).toBe(batch[1]);
            expect(next.annotationsDirtyPages.has(0)).toBe(true);
        });

        it("should not mark the page dirty when every annotation is ephemeral", () => {
            const state = createStateWithAnnotations([squareAnnotation("a1")]);
            const next = reducer(state, {
                type: "ADD_ANNOTATIONS",
                pageIndex: 0,
                annotations: [squareAnnotation("p1", true), squareAnnotation("p2", true)],
            });
            expect(next.pageAnnotations.get(0)).toHaveLength(3);
            expect(next.annotationsDirtyPages.size).toBe(0);
        });

        it("should mark the page dirty when the batch mixes ephemeral and real annotations", () => {
            const state = createStateWithAnnotations([squareAnnotation("a1")]);
            const next = reducer(state, {
                type: "ADD_ANNOTATIONS",
                pageIndex: 0,
                annotations: [squareAnnotation("p1", true), squareAnnotation("real")],
            });
            expect(next.annotationsDirtyPages.has(0)).toBe(true);
        });

        it("should return the same state reference for an empty batch", () => {
            const state = createLoadedState();
            const next = reducer(state, { type: "ADD_ANNOTATIONS", pageIndex: 0, annotations: [] });
            expect(next).toBe(state);
        });
    });

    describe("UPDATE_ANNOTATION", () => {
        it("should replace the annotation at the given index and mark the page dirty", () => {
            const state = createStateWithAnnotations([squareAnnotation("a1"), squareAnnotation("a2")]);
            const replacement = squareAnnotation("a2-moved");

            const next = reducer(state, {
                type: "UPDATE_ANNOTATION",
                pageIndex: 0,
                annotationIndex: 1,
                annotation: replacement,
            });

            const list = next.pageAnnotations.get(0)!;
            expect(list).toHaveLength(2);
            expect(list[0]).toBe(state.pageAnnotations.get(0)![0]);
            expect(list[1]).toBe(replacement);
            expect(next.annotationsDirtyPages.has(0)).toBe(true);
        });

        it("should mark the page dirty when promoting an ephemeral annotation", () => {
            const state = createStateWithAnnotations([squareAnnotation("preview", true)]);
            const next = reducer(state, {
                type: "UPDATE_ANNOTATION",
                pageIndex: 0,
                annotationIndex: 0,
                annotation: squareAnnotation("promoted"),
            });
            expect(next.annotationsDirtyPages.has(0)).toBe(true);
        });

        it("should mark the page dirty when demoting a real annotation to ephemeral", () => {
            const state = createStateWithAnnotations([squareAnnotation("real")]);
            const next = reducer(state, {
                type: "UPDATE_ANNOTATION",
                pageIndex: 0,
                annotationIndex: 0,
                annotation: squareAnnotation("real", true),
            });
            expect(next.annotationsDirtyPages.has(0)).toBe(true);
        });

        it("should not mark the page dirty when updating between ephemeral annotations", () => {
            const state = createStateWithAnnotations([squareAnnotation("preview", true)]);
            const next = reducer(state, {
                type: "UPDATE_ANNOTATION",
                pageIndex: 0,
                annotationIndex: 0,
                annotation: squareAnnotation("preview-2", true),
            });
            expect(next.annotationsDirtyPages.size).toBe(0);
        });

        it("should return the same state reference for an out-of-range index", () => {
            const state = createStateWithAnnotations([squareAnnotation("a1")]);
            const next = reducer(state, {
                type: "UPDATE_ANNOTATION",
                pageIndex: 0,
                annotationIndex: 5,
                annotation: squareAnnotation("a2"),
            });
            expect(next).toBe(state);
        });

        it("should return the same state reference for a page without annotations", () => {
            const state = createLoadedState();
            const next = reducer(state, {
                type: "UPDATE_ANNOTATION",
                pageIndex: 1,
                annotationIndex: 0,
                annotation: squareAnnotation("a1"),
            });
            expect(next).toBe(state);
        });
    });

    describe("UPDATE_ANNOTATIONS", () => {
        it("should apply every update in one pass and mark the page dirty", () => {
            const state = createStateWithAnnotations([squareAnnotation("a1"), squareAnnotation("a2")]);
            const moved = squareAnnotation("a1-moved");
            const resized = squareAnnotation("a2-resized");

            const next = reducer(state, {
                type: "UPDATE_ANNOTATIONS",
                pageIndex: 0,
                updates: [
                    { annotationIndex: 0, annotation: moved },
                    { annotationIndex: 1, annotation: resized },
                ],
            });

            const list = next.pageAnnotations.get(0)!;
            expect(list[0]).toBe(moved);
            expect(list[1]).toBe(resized);
            expect(next.annotationsDirtyPages.has(0)).toBe(true);
        });

        it("should skip out-of-range indices and keep the remaining updates", () => {
            const state = createStateWithAnnotations([squareAnnotation("a1")]);
            const moved = squareAnnotation("a1-moved");

            const next = reducer(state, {
                type: "UPDATE_ANNOTATIONS",
                pageIndex: 0,
                updates: [
                    { annotationIndex: 5, annotation: squareAnnotation("ignored") },
                    { annotationIndex: 0, annotation: moved },
                ],
            });

            expect(next.pageAnnotations.get(0)![0]).toBe(moved);
            expect(next.annotationsDirtyPages.has(0)).toBe(true);
        });

        it("should not mark the page dirty when updating between ephemeral annotations", () => {
            const state = createStateWithAnnotations([squareAnnotation("p1", true)]);
            const next = reducer(state, {
                type: "UPDATE_ANNOTATIONS",
                pageIndex: 0,
                updates: [{ annotationIndex: 0, annotation: squareAnnotation("p2", true) }],
            });
            expect(next.pageAnnotations.get(0)![0].name).toBe("p2");
            expect(next.annotationsDirtyPages.size).toBe(0);
        });

        it("should mark the page dirty when a single update promotes an ephemeral annotation", () => {
            const state = createStateWithAnnotations([squareAnnotation("p1", true)]);
            const next = reducer(state, {
                type: "UPDATE_ANNOTATIONS",
                pageIndex: 0,
                updates: [{ annotationIndex: 0, annotation: squareAnnotation("real") }],
            });
            expect(next.annotationsDirtyPages.has(0)).toBe(true);
        });

        it("should return the same state reference for an empty updates list", () => {
            const state = createStateWithAnnotations([squareAnnotation("a1")]);
            const next = reducer(state, { type: "UPDATE_ANNOTATIONS", pageIndex: 0, updates: [] });
            expect(next).toBe(state);
        });

        it("should return the same state reference for a page without annotations", () => {
            const state = createLoadedState();
            const next = reducer(state, {
                type: "UPDATE_ANNOTATIONS",
                pageIndex: 1,
                updates: [{ annotationIndex: 0, annotation: squareAnnotation("a1") }],
            });
            expect(next).toBe(state);
        });
    });

    describe("REMOVE_ANNOTATION", () => {
        it("should remove the annotation, clear the selection, and mark the page dirty", () => {
            const a1 = squareAnnotation("a1");
            const a2 = squareAnnotation("a2");
            let state = createStateWithAnnotations([a1, a2]);
            state = reducer(state, { type: "SELECT_ANNOTATION", pageIndex: 0, annotationIndex: 1 });

            const next = reducer(state, { type: "REMOVE_ANNOTATION", pageIndex: 0, annotationIndex: 1 });

            expect(next.pageAnnotations.get(0)).toEqual([a1]);
            expect(next.selectedAnnotation).toBeNull();
            expect(next.annotationsDirtyPages.has(0)).toBe(true);
        });

        it("should not mark the page dirty when removing an ephemeral annotation", () => {
            const state = createStateWithAnnotations([squareAnnotation("preview", true)]);
            const next = reducer(state, { type: "REMOVE_ANNOTATION", pageIndex: 0, annotationIndex: 0 });
            expect(next.pageAnnotations.get(0)).toEqual([]);
            expect(next.annotationsDirtyPages.size).toBe(0);
        });

        it("should return the same state reference for a page without annotations", () => {
            const state = createLoadedState();
            const next = reducer(state, { type: "REMOVE_ANNOTATION", pageIndex: 2, annotationIndex: 0 });
            expect(next).toBe(state);
        });

        it("should return the same state reference for an out-of-range index", () => {
            const state = createStateWithAnnotations([squareAnnotation("a1")]);
            const next = reducer(state, { type: "REMOVE_ANNOTATION", pageIndex: 0, annotationIndex: 5 });
            expect(next).toBe(state);
        });
    });

    describe("RESTORE_PAGE_ANNOTATIONS", () => {
        it("should replace the page list, mark the page dirty, and clear the selection", () => {
            let state = createStateWithAnnotations([squareAnnotation("a1"), squareAnnotation("a2")]);
            state = reducer(state, { type: "SELECT_ANNOTATION", pageIndex: 0, annotationIndex: 0 });
            const restored = [squareAnnotation("a1-before")];

            const next = reducer(state, { type: "RESTORE_PAGE_ANNOTATIONS", pageIndex: 0, annotations: restored });

            expect(next.pageAnnotations.get(0)).toBe(restored);
            expect(next.annotationsDirtyPages.has(0)).toBe(true);
            expect(next.selectedAnnotation).toBeNull();
        });
    });

    describe("annotation selection", () => {
        it("should select an annotation by page and index", () => {
            const state = createStateWithAnnotations([squareAnnotation("a1")]);
            const next = reducer(state, { type: "SELECT_ANNOTATION", pageIndex: 0, annotationIndex: 0 });
            expect(next.selectedAnnotation).toEqual({ pageIndex: 0, annotationIndex: 0 });
        });

        it("should return the same state reference when already selected", () => {
            let state = createStateWithAnnotations([squareAnnotation("a1")]);
            state = reducer(state, { type: "SELECT_ANNOTATION", pageIndex: 0, annotationIndex: 0 });
            const next = reducer(state, { type: "SELECT_ANNOTATION", pageIndex: 0, annotationIndex: 0 });
            expect(next).toBe(state);
        });

        it("should deselect the annotation", () => {
            let state = createStateWithAnnotations([squareAnnotation("a1")]);
            state = reducer(state, { type: "SELECT_ANNOTATION", pageIndex: 0, annotationIndex: 0 });
            const next = reducer(state, { type: "DESELECT_ANNOTATION" });
            expect(next.selectedAnnotation).toBeNull();
        });

        it("should return the same state reference when nothing is selected", () => {
            const state = createLoadedState();
            const next = reducer(state, { type: "DESELECT_ANNOTATION" });
            expect(next).toBe(state);
        });
    });
});
