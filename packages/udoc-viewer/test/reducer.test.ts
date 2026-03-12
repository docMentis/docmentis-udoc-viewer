import { describe, it, expect } from "vitest";
import { reducer } from "../src/ui/viewer/reducer";
import { initialState } from "../src/ui/viewer/state";
import type { Action } from "../src/ui/viewer/actions";
import type { Destination } from "../src/ui/viewer/navigation";

describe("reducer", () => {
    describe("Document actions", () => {
        describe("SET_DOC", () => {
            it("should set document with default view settings", () => {
                const action: Action = {
                    type: "SET_DOC",
                    doc: { id: "test-doc" },
                    pageCount: 10,
                    pageInfos: [{ width: 612, height: 792 }],
                };

                const result = reducer(initialState, action);

                expect(result.doc).toEqual({ id: "test-doc" });
                expect(result.page).toBe(1);
                expect(result.pageCount).toBe(10);
                expect(result.pageInfos).toHaveLength(1);
            });

            it("should apply view defaults when provided", () => {
                const action: Action = {
                    type: "SET_DOC",
                    doc: { id: "test-doc" },
                    pageCount: 5,
                    pageInfos: [],
                    viewDefaults: {
                        scrollMode: "spread",
                        layoutMode: "double-page",
                        zoomMode: "fit-spread",
                        zoom: 1.5,
                        pageRotation: 90,
                    },
                };

                const result = reducer(initialState, action);

                expect(result.scrollMode).toBe("spread");
                expect(result.layoutMode).toBe("double-page");
                expect(result.zoomMode).toBe("fit-spread");
                expect(result.zoom).toBe(1.5);
                expect(result.pageRotation).toBe(90);
            });

            it("should return same state if doc is same reference", () => {
                const doc = { id: "same-doc" };
                const state = { ...initialState, doc };
                const action: Action = {
                    type: "SET_DOC",
                    doc,
                    pageCount: 5,
                    pageInfos: [],
                };

                const result = reducer(state, action);

                expect(result).toBe(state);
            });
        });

        describe("CLEAR_DOC", () => {
            it("should clear document and reset related state", () => {
                const state = {
                    ...initialState,
                    doc: { id: "test-doc" },
                    pageCount: 10,
                    page: 5,
                    needsPassword: true,
                    passwordError: "wrong password",
                    outline: [{ title: "Chapter 1", children: [], initiallyCollapsed: false }],
                    pageAnnotations: new Map([[0, []]]),
                    pageText: new Map([[0, []]]),
                    searchQuery: "test",
                    searchMatches: [{ pageIndex: 0, charOffset: 0, length: 4, rects: [], context: ["", "test", ""] }],
                    searchActiveIndex: 0,
                };

                const action: Action = { type: "CLEAR_DOC" };
                const result = reducer(state, action);

                expect(result.doc).toBeNull();
                expect(result.page).toBe(1);
                expect(result.pageCount).toBe(0);
                expect(result.needsPassword).toBe(false);
                expect(result.passwordError).toBeNull();
                expect(result.outline).toBeNull();
                expect(result.pageAnnotations.size).toBe(0);
                expect(result.pageText.size).toBe(0);
                expect(result.searchQuery).toBe("");
                expect(result.searchMatches).toHaveLength(0);
            });

            it("should return same state if already cleared", () => {
                const state = { ...initialState, doc: null, pageCount: 0 };
                const action: Action = { type: "CLEAR_DOC" };

                const result = reducer(state, action);

                expect(result).toBe(state);
            });
        });

        describe("SET_PAGE", () => {
            it("should set page within valid range", () => {
                const state = { ...initialState, pageCount: 10 };

                const action1: Action = { type: "SET_PAGE", page: 5 };
                expect(reducer(state, action1).page).toBe(5);

                const action2: Action = { type: "SET_PAGE", page: 1 };
                expect(reducer(state, action2).page).toBe(1);

                const action3: Action = { type: "SET_PAGE", page: 10 };
                expect(reducer(state, action3).page).toBe(10);
            });

            it("should clamp page to valid range", () => {
                const state = { ...initialState, pageCount: 10 };

                const action1: Action = { type: "SET_PAGE", page: -5 };
                expect(reducer(state, action1).page).toBe(1);

                const action2: Action = { type: "SET_PAGE", page: 100 };
                expect(reducer(state, action2).page).toBe(10);
            });

            it("should handle zero pageCount", () => {
                const state = { ...initialState, pageCount: 0 };
                const action: Action = { type: "SET_PAGE", page: 5 };

                expect(reducer(state, action).page).toBe(1);
            });

            it("should return same state if page unchanged", () => {
                const state = { ...initialState, page: 5, pageCount: 10 };
                const action: Action = { type: "SET_PAGE", page: 5 };

                expect(reducer(state, action)).toBe(state);
            });
        });

        describe("UPDATE_PAGE_SIZES", () => {
            it("should update page infos", () => {
                const action: Action = {
                    type: "UPDATE_PAGE_SIZES",
                    pageInfos: [
                        { width: 612, height: 792 },
                        { width: 612, height: 792 },
                    ],
                };

                const result = reducer(initialState, action);

                expect(result.pageInfos).toHaveLength(2);
            });
        });
    });

    describe("Password protection", () => {
        describe("SET_NEEDS_PASSWORD", () => {
            it("should set needsPassword flag", () => {
                const action: Action = { type: "SET_NEEDS_PASSWORD", needsPassword: true };
                const result = reducer(initialState, action);

                expect(result.needsPassword).toBe(true);
            });

            it("should clear passwordError when setting needsPassword", () => {
                const state = { ...initialState, passwordError: "previous error" };
                const action: Action = { type: "SET_NEEDS_PASSWORD", needsPassword: true };
                const result = reducer(state, action);

                expect(result.passwordError).toBeNull();
            });

            it("should return same state if needsPassword unchanged", () => {
                const state = { ...initialState, needsPassword: true };
                const action: Action = { type: "SET_NEEDS_PASSWORD", needsPassword: true };

                expect(reducer(state, action)).toBe(state);
            });
        });

        describe("AUTHENTICATE_START", () => {
            it("should set isAuthenticating to true", () => {
                const action: Action = { type: "AUTHENTICATE_START" };
                const result = reducer(initialState, action);

                expect(result.isAuthenticating).toBe(true);
                expect(result.passwordError).toBeNull();
            });

            it("should return same state if already authenticating", () => {
                const state = { ...initialState, isAuthenticating: true };
                const action: Action = { type: "AUTHENTICATE_START" };

                expect(reducer(state, action)).toBe(state);
            });
        });

        describe("AUTHENTICATE_SUCCESS", () => {
            it("should clear authentication state", () => {
                const state = {
                    ...initialState,
                    isAuthenticating: true,
                    needsPassword: true,
                    passwordError: "error",
                };
                const action: Action = { type: "AUTHENTICATE_SUCCESS" };
                const result = reducer(state, action);

                expect(result.isAuthenticating).toBe(false);
                expect(result.needsPassword).toBe(false);
                expect(result.passwordError).toBeNull();
            });
        });

        describe("AUTHENTICATE_FAILURE", () => {
            it("should set error and stop authenticating", () => {
                const state = { ...initialState, isAuthenticating: true };
                const action: Action = { type: "AUTHENTICATE_FAILURE", error: "Wrong password" };
                const result = reducer(state, action);

                expect(result.isAuthenticating).toBe(false);
                expect(result.passwordError).toBe("Wrong password");
            });
        });

        describe("CLEAR_PASSWORD_ERROR", () => {
            it("should clear password error", () => {
                const state = { ...initialState, passwordError: "error" };
                const action: Action = { type: "CLEAR_PASSWORD_ERROR" };
                const result = reducer(state, action);

                expect(result.passwordError).toBeNull();
            });

            it("should return same state if no error", () => {
                const state = { ...initialState, passwordError: null };
                const action: Action = { type: "CLEAR_PASSWORD_ERROR" };

                expect(reducer(state, action)).toBe(state);
            });
        });
    });

    describe("Outline", () => {
        describe("LOAD_OUTLINE", () => {
            it("should set outlineLoading to true", () => {
                const action: Action = { type: "LOAD_OUTLINE" };
                const result = reducer(initialState, action);

                expect(result.outlineLoading).toBe(true);
            });

            it("should return same state if already loading", () => {
                const state = { ...initialState, outlineLoading: true };
                const action: Action = { type: "LOAD_OUTLINE" };

                expect(reducer(state, action)).toBe(state);
            });
        });

        describe("SET_OUTLINE", () => {
            it("should set outline and clear loading", () => {
                const state = { ...initialState, outlineLoading: true };
                const outline = [{ title: "Chapter 1", children: [], initiallyCollapsed: false }];
                const action: Action = { type: "SET_OUTLINE", outline };
                const result = reducer(state, action);

                expect(result.outline).toEqual(outline);
                expect(result.outlineLoading).toBe(false);
            });
        });
    });

    describe("Annotations", () => {
        describe("LOAD_PAGE_ANNOTATIONS", () => {
            it("should add page to loading set", () => {
                const action: Action = { type: "LOAD_PAGE_ANNOTATIONS", pageIndex: 0 };
                const result = reducer(initialState, action);

                expect(result.annotationsLoading.has(0)).toBe(true);
            });

            it("should not add if already loading", () => {
                const state = {
                    ...initialState,
                    annotationsLoading: new Set([0]),
                };
                const action: Action = { type: "LOAD_PAGE_ANNOTATIONS", pageIndex: 0 };

                expect(reducer(state, action)).toBe(state);
            });

            it("should not add if already loaded", () => {
                const state = {
                    ...initialState,
                    pageAnnotations: new Map([[0, []]]),
                };
                const action: Action = { type: "LOAD_PAGE_ANNOTATIONS", pageIndex: 0 };

                expect(reducer(state, action)).toBe(state);
            });
        });

        describe("SET_PAGE_ANNOTATIONS", () => {
            it("should store annotations and remove from loading", () => {
                const state = {
                    ...initialState,
                    annotationsLoading: new Set([0]),
                };
                const action: Action = {
                    type: "SET_PAGE_ANNOTATIONS",
                    pageIndex: 0,
                    annotations: [
                        {
                            type: "highlight",
                            bounds: { x: 0, y: 0, width: 100, height: 20 },
                            quads: [
                                {
                                    points: [
                                        { x: 0, y: 0 },
                                        { x: 100, y: 0 },
                                        { x: 100, y: 20 },
                                        { x: 0, y: 20 },
                                    ],
                                },
                            ],
                        },
                    ],
                };
                const result = reducer(state, action);

                expect(result.pageAnnotations.has(0)).toBe(true);
                expect(result.annotationsLoading.has(0)).toBe(false);
            });
        });

        describe("CLEAR_ANNOTATIONS", () => {
            it("should clear all annotations", () => {
                const state = {
                    ...initialState,
                    pageAnnotations: new Map([[0, []]]),
                    annotationsLoading: new Set([1]),
                };
                const action: Action = { type: "CLEAR_ANNOTATIONS" };
                const result = reducer(state, action);

                expect(result.pageAnnotations.size).toBe(0);
                expect(result.annotationsLoading.size).toBe(0);
            });

            it("should return same state if already empty", () => {
                const state = {
                    ...initialState,
                    pageAnnotations: new Map(),
                    annotationsLoading: new Set(),
                };
                const action: Action = { type: "CLEAR_ANNOTATIONS" };

                expect(reducer(state, action)).toBe(state);
            });
        });
    });

    describe("Text content", () => {
        describe("LOAD_PAGE_TEXT", () => {
            it("should add page to text loading set", () => {
                const action: Action = { type: "LOAD_PAGE_TEXT", pageIndex: 0 };
                const result = reducer(initialState, action);

                expect(result.textLoading.has(0)).toBe(true);
            });
        });

        describe("SET_PAGE_TEXT", () => {
            it("should store text and remove from loading", () => {
                const state = {
                    ...initialState,
                    textLoading: new Set([0]),
                };
                const action: Action = {
                    type: "SET_PAGE_TEXT",
                    pageIndex: 0,
                    text: [
                        {
                            text: "Hello",
                            glyphs: [],
                            fontName: "Arial",
                            fontSize: 12,
                            color: "#000",
                            fontStyle: "normal",
                            transform: { scaleX: 1, scaleY: 1, skewX: 0, skewY: 0, translateX: 0, translateY: 0 },
                        },
                    ],
                };
                const result = reducer(state, action);

                expect(result.pageText.has(0)).toBe(true);
                expect(result.textLoading.has(0)).toBe(false);
            });
        });

        describe("CLEAR_TEXT", () => {
            it("should clear all text", () => {
                const state = {
                    ...initialState,
                    pageText: new Map([[0, []]]),
                    textLoading: new Set([1]),
                };
                const action: Action = { type: "CLEAR_TEXT" };
                const result = reducer(state, action);

                expect(result.pageText.size).toBe(0);
                expect(result.textLoading.size).toBe(0);
            });
        });
    });

    describe("Navigation", () => {
        describe("NAVIGATE_TO_PAGE", () => {
            it("should set navigation target", () => {
                const state = { ...initialState, pageCount: 10 };
                const action: Action = { type: "NAVIGATE_TO_PAGE", page: 5 };
                const result = reducer(state, action);

                expect(result.navigationTarget).toEqual({ page: 5 });
            });

            it("should clamp page to valid range", () => {
                const state = { ...initialState, pageCount: 10 };
                const action: Action = { type: "NAVIGATE_TO_PAGE", page: 100 };
                const result = reducer(state, action);

                expect(result.navigationTarget?.page).toBe(10);
            });

            it("should return same state if target unchanged", () => {
                const state = {
                    ...initialState,
                    pageCount: 10,
                    navigationTarget: { page: 5 },
                };
                const action: Action = { type: "NAVIGATE_TO_PAGE", page: 5 };

                expect(reducer(state, action)).toBe(state);
            });
        });

        describe("NAVIGATE_TO_DESTINATION", () => {
            it("should convert destination to navigation target", () => {
                const state = { ...initialState, pageCount: 10 };
                const destination: Destination = {
                    pageIndex: 4,
                    display: { type: "xyz", left: 100, top: 200, zoom: 1.5 },
                };
                const action: Action = { type: "NAVIGATE_TO_DESTINATION", destination };
                const result = reducer(state, action);

                expect(result.navigationTarget).toEqual({
                    page: 5,
                    scrollTo: { x: 100, y: 200 },
                    zoom: 1.5,
                });
            });
        });

        describe("CLEAR_NAVIGATION_TARGET", () => {
            it("should clear navigation target", () => {
                const state = {
                    ...initialState,
                    navigationTarget: { page: 5 },
                };
                const action: Action = { type: "CLEAR_NAVIGATION_TARGET" };
                const result = reducer(state, action);

                expect(result.navigationTarget).toBeNull();
            });

            it("should return same state if already null", () => {
                const state = { ...initialState, navigationTarget: null };
                const action: Action = { type: "CLEAR_NAVIGATION_TARGET" };

                expect(reducer(state, action)).toBe(state);
            });
        });
    });

    describe("View modes", () => {
        describe("SET_SCROLL_MODE", () => {
            it("should set scroll mode", () => {
                const action: Action = { type: "SET_SCROLL_MODE", mode: "spread" };
                const result = reducer(initialState, action);

                expect(result.scrollMode).toBe("spread");
            });

            it("should return same state if mode unchanged", () => {
                const state = { ...initialState, scrollMode: "spread" };
                const action: Action = { type: "SET_SCROLL_MODE", mode: "spread" };

                expect(reducer(state, action)).toBe(state);
            });
        });

        describe("SET_LAYOUT_MODE", () => {
            it("should set layout mode", () => {
                const action: Action = { type: "SET_LAYOUT_MODE", mode: "double-page" };
                const result = reducer(initialState, action);

                expect(result.layoutMode).toBe("double-page");
            });
        });

        describe("SET_ZOOM_MODE", () => {
            it("should set zoom mode", () => {
                const action: Action = { type: "SET_ZOOM_MODE", mode: "fit-spread" };
                const result = reducer(initialState, action);

                expect(result.zoomMode).toBe("fit-spread");
            });
        });

        describe("SET_ZOOM", () => {
            it("should set zoom and change mode to custom", () => {
                const action: Action = { type: "SET_ZOOM", zoom: 2 };
                const result = reducer(initialState, action);

                expect(result.zoom).toBe(2);
                expect(result.zoomMode).toBe("custom");
            });

            it("should clamp zoom to valid range", () => {
                const state = { ...initialState, minZoom: 0.1, maxZoom: 5 };
                const action: Action = { type: "SET_ZOOM", zoom: 10 };
                const result = reducer(state, action);

                expect(result.zoom).toBe(5);
            });
        });

        describe("SET_EFFECTIVE_ZOOM", () => {
            it("should set effective zoom", () => {
                const action: Action = { type: "SET_EFFECTIVE_ZOOM", zoom: 1.5 };
                const result = reducer(initialState, action);

                expect(result.effectiveZoom).toBe(1.5);
            });
        });

        describe("ZOOM_IN", () => {
            it("should zoom to next step", () => {
                const state = { ...initialState, zoom: 1, zoomSteps: [0.5, 1, 1.5, 2] };
                const action: Action = { type: "ZOOM_IN" };
                const result = reducer(state, action);

                expect(result.zoom).toBe(1.5);
                expect(result.zoomMode).toBe("custom");
            });

            it("should stay at max zoom if already at max", () => {
                const state = { ...initialState, zoom: 5, zoomSteps: [0.5, 1, 2, 5], maxZoom: 5 };
                const action: Action = { type: "ZOOM_IN" };
                const result = reducer(state, action);

                expect(result.zoom).toBe(5);
            });

            it("should use effectiveZoom if available", () => {
                const state = {
                    ...initialState,
                    zoom: 1,
                    effectiveZoom: 1.2,
                    zoomSteps: [0.5, 1, 1.5, 2],
                };
                const action: Action = { type: "ZOOM_IN" };
                const result = reducer(state, action);

                expect(result.zoom).toBe(1.5);
            });
        });

        describe("ZOOM_OUT", () => {
            it("should zoom to previous step", () => {
                const state = { ...initialState, zoom: 2, zoomSteps: [0.5, 1, 1.5, 2] };
                const action: Action = { type: "ZOOM_OUT" };
                const result = reducer(state, action);

                expect(result.zoom).toBe(1.5);
                expect(result.zoomMode).toBe("custom");
            });

            it("should stay at min zoom if already at min", () => {
                const state = { ...initialState, zoom: 0.1, zoomSteps: [0.1, 0.5, 1], minZoom: 0.1 };
                const action: Action = { type: "ZOOM_OUT" };
                const result = reducer(state, action);

                expect(result.zoom).toBe(0.1);
            });
        });

        describe("SET_PAGE_ROTATION", () => {
            it("should set page rotation", () => {
                const action: Action = { type: "SET_PAGE_ROTATION", rotation: 90 };
                const result = reducer(initialState, action);

                expect(result.pageRotation).toBe(90);
            });

            it("should return same state if rotation unchanged", () => {
                const state = { ...initialState, pageRotation: 90 };
                const action: Action = { type: "SET_PAGE_ROTATION", rotation: 90 };

                expect(reducer(state, action)).toBe(state);
            });
        });

        describe("SET_SPACING_MODE", () => {
            it("should set spacing mode 'all'", () => {
                const action: Action = { type: "SET_SPACING_MODE", mode: "all" };
                const result = reducer(initialState, action);

                expect(result.spacingMode).toBe("all");
                expect(result.pageSpacing).toBe(20);
                expect(result.spreadSpacing).toBe(20);
            });

            it("should set spacing mode 'none'", () => {
                const action: Action = { type: "SET_SPACING_MODE", mode: "none" };
                const result = reducer(initialState, action);

                expect(result.spacingMode).toBe("none");
                expect(result.pageSpacing).toBe(0);
                expect(result.spreadSpacing).toBe(0);
            });

            it("should set spacing mode 'spread-only'", () => {
                const action: Action = { type: "SET_SPACING_MODE", mode: "spread-only" };
                const result = reducer(initialState, action);

                expect(result.spacingMode).toBe("spread-only");
                expect(result.pageSpacing).toBe(0);
                expect(result.spreadSpacing).toBe(20);
            });

            it("should set spacing mode 'page-only'", () => {
                const action: Action = { type: "SET_SPACING_MODE", mode: "page-only" };
                const result = reducer(initialState, action);

                expect(result.spacingMode).toBe("page-only");
                expect(result.pageSpacing).toBe(20);
                expect(result.spreadSpacing).toBe(0);
            });
        });

        describe("SET_PAGE_SPACING", () => {
            it("should set page spacing", () => {
                const action: Action = { type: "SET_PAGE_SPACING", spacing: 30 };
                const result = reducer(initialState, action);

                expect(result.pageSpacing).toBe(30);
            });

            it("should not allow negative spacing", () => {
                const action: Action = { type: "SET_PAGE_SPACING", spacing: -10 };
                const result = reducer(initialState, action);

                expect(result.pageSpacing).toBe(0);
            });
        });

        describe("SET_SPREAD_SPACING", () => {
            it("should set spread spacing", () => {
                const action: Action = { type: "SET_SPREAD_SPACING", spacing: 40 };
                const result = reducer(initialState, action);

                expect(result.spreadSpacing).toBe(40);
            });
        });
    });

    describe("UI", () => {
        describe("TOGGLE_PANEL", () => {
            it("should open panel when closed", () => {
                const action: Action = { type: "TOGGLE_PANEL", panel: "thumbnail" };
                const result = reducer(initialState, action);

                expect(result.activePanel).toBe("thumbnail");
            });

            it("should close panel when same panel clicked", () => {
                const state = { ...initialState, activePanel: "thumbnail" as const };
                const action: Action = { type: "TOGGLE_PANEL", panel: "thumbnail" };
                const result = reducer(state, action);

                expect(result.activePanel).toBeNull();
            });

            it("should not open left panel if leftPanelVisible is false", () => {
                const state = { ...initialState, leftPanelVisible: false };
                const action: Action = { type: "TOGGLE_PANEL", panel: "thumbnail" };
                const result = reducer(state, action);

                expect(result.activePanel).toBeNull();
            });

            it("should not open right panel if rightPanelVisible is false", () => {
                const state = { ...initialState, rightPanelVisible: false };
                const action: Action = { type: "TOGGLE_PANEL", panel: "search" };
                const result = reducer(state, action);

                expect(result.activePanel).toBeNull();
            });

            it("should not open disabled panel", () => {
                const state = {
                    ...initialState,
                    disabledPanels: new Set(["thumbnail" as const]),
                };
                const action: Action = { type: "TOGGLE_PANEL", panel: "thumbnail" };
                const result = reducer(state, action);

                expect(result.activePanel).toBeNull();
            });

            it("should clear search state when closing search panel", () => {
                const state = {
                    ...initialState,
                    activePanel: "search" as const,
                    searchQuery: "test",
                    searchMatches: [{ pageIndex: 0, charOffset: 0, length: 4, rects: [], context: ["", "test", ""] }],
                    searchActiveIndex: 0,
                };
                const action: Action = { type: "TOGGLE_PANEL", panel: "search" };
                const result = reducer(state, action);

                expect(result.activePanel).toBeNull();
                expect(result.searchQuery).toBe("");
                expect(result.searchMatches).toHaveLength(0);
                expect(result.searchActiveIndex).toBe(-1);
            });
        });

        describe("CLOSE_PANEL", () => {
            it("should close active panel", () => {
                const state = { ...initialState, activePanel: "thumbnail" as const };
                const action: Action = { type: "CLOSE_PANEL" };
                const result = reducer(state, action);

                expect(result.activePanel).toBeNull();
            });

            it("should clear search state when closing search panel", () => {
                const state = {
                    ...initialState,
                    activePanel: "search" as const,
                    searchQuery: "test",
                };
                const action: Action = { type: "CLOSE_PANEL" };
                const result = reducer(state, action);

                expect(result.searchQuery).toBe("");
            });

            it("should return same state if no panel open", () => {
                const state = { ...initialState, activePanel: null };
                const action: Action = { type: "CLOSE_PANEL" };

                expect(reducer(state, action)).toBe(state);
            });
        });

        describe("SET_LEFT_PANEL_WIDTH", () => {
            it("should set left panel width", () => {
                const action: Action = { type: "SET_LEFT_PANEL_WIDTH", width: 250 };
                const result = reducer(initialState, action);

                expect(result.leftPanelWidth).toBe(250);
            });
        });

        describe("SET_RIGHT_PANEL_WIDTH", () => {
            it("should set right panel width", () => {
                const action: Action = { type: "SET_RIGHT_PANEL_WIDTH", width: 300 };
                const result = reducer(initialState, action);

                expect(result.rightPanelWidth).toBe(300);
            });
        });
    });

    describe("Component visibility", () => {
        describe("SET_TOOLBAR_VISIBLE", () => {
            it("should set toolbar visibility", () => {
                const action: Action = { type: "SET_TOOLBAR_VISIBLE", visible: false };
                const result = reducer(initialState, action);

                expect(result.toolbarVisible).toBe(false);
            });
        });

        describe("SET_LEFT_PANEL_VISIBLE", () => {
            it("should set left panel visibility", () => {
                const action: Action = { type: "SET_LEFT_PANEL_VISIBLE", visible: false };
                const result = reducer(initialState, action);

                expect(result.leftPanelVisible).toBe(false);
            });

            it("should close active left panel when hiding", () => {
                const state = { ...initialState, activePanel: "thumbnail" as const };
                const action: Action = { type: "SET_LEFT_PANEL_VISIBLE", visible: false };
                const result = reducer(state, action);

                expect(result.activePanel).toBeNull();
            });

            it("should not close right panel when hiding left panel", () => {
                const state = { ...initialState, activePanel: "search" as const };
                const action: Action = { type: "SET_LEFT_PANEL_VISIBLE", visible: false };
                const result = reducer(state, action);

                expect(result.activePanel).toBe("search");
            });
        });

        describe("SET_RIGHT_PANEL_VISIBLE", () => {
            it("should close active right panel when hiding", () => {
                const state = { ...initialState, activePanel: "search" as const };
                const action: Action = { type: "SET_RIGHT_PANEL_VISIBLE", visible: false };
                const result = reducer(state, action);

                expect(result.activePanel).toBeNull();
            });
        });

        describe("SET_PANEL_DISABLED", () => {
            it("should disable panel", () => {
                const action: Action = { type: "SET_PANEL_DISABLED", panel: "thumbnail", disabled: true };
                const result = reducer(initialState, action);

                expect(result.disabledPanels.has("thumbnail")).toBe(true);
            });

            it("should enable panel", () => {
                const state = {
                    ...initialState,
                    disabledPanels: new Set(["thumbnail" as const]),
                };
                const action: Action = { type: "SET_PANEL_DISABLED", panel: "thumbnail", disabled: false };
                const result = reducer(state, action);

                expect(result.disabledPanels.has("thumbnail")).toBe(false);
            });

            it("should close panel when disabling active panel", () => {
                const state = { ...initialState, activePanel: "thumbnail" as const };
                const action: Action = { type: "SET_PANEL_DISABLED", panel: "thumbnail", disabled: true };
                const result = reducer(state, action);

                expect(result.activePanel).toBeNull();
            });
        });

        describe("SET_THEME", () => {
            it("should set theme", () => {
                const action: Action = { type: "SET_THEME", theme: "dark" };
                const result = reducer(initialState, action);

                expect(result.theme).toBe("dark");
            });
        });

        describe("SET_MIN_ZOOM", () => {
            it("should set min zoom and adjust current zoom if needed", () => {
                const state = { ...initialState, zoom: 0.5 };
                const action: Action = { type: "SET_MIN_ZOOM", zoom: 1 };
                const result = reducer(state, action);

                expect(result.minZoom).toBe(1);
                expect(result.zoom).toBe(1);
            });
        });

        describe("SET_MAX_ZOOM", () => {
            it("should set max zoom and adjust current zoom if needed", () => {
                const state = { ...initialState, zoom: 5 };
                const action: Action = { type: "SET_MAX_ZOOM", zoom: 3 };
                const result = reducer(state, action);

                expect(result.maxZoom).toBe(3);
                expect(result.zoom).toBe(3);
            });
        });
    });

    describe("Annotation highlight", () => {
        describe("HIGHLIGHT_ANNOTATION", () => {
            it("should set highlighted annotation", () => {
                const action: Action = {
                    type: "HIGHLIGHT_ANNOTATION",
                    pageIndex: 0,
                    bounds: { x: 10, y: 20, width: 100, height: 50 },
                };
                const result = reducer(initialState, action);

                expect(result.highlightedAnnotation).toEqual({
                    pageIndex: 0,
                    bounds: { x: 10, y: 20, width: 100, height: 50 },
                });
            });
        });

        describe("CLEAR_ANNOTATION_HIGHLIGHT", () => {
            it("should clear highlighted annotation", () => {
                const state = {
                    ...initialState,
                    highlightedAnnotation: { pageIndex: 0, bounds: { x: 0, y: 0, width: 100, height: 50 } },
                };
                const action: Action = { type: "CLEAR_ANNOTATION_HIGHLIGHT" };
                const result = reducer(state, action);

                expect(result.highlightedAnnotation).toBeNull();
            });
        });
    });

    describe("Fullscreen", () => {
        describe("SET_FULLSCREEN", () => {
            it("should set fullscreen state", () => {
                const action: Action = { type: "SET_FULLSCREEN", isFullscreen: true };
                const result = reducer(initialState, action);

                expect(result.isFullscreen).toBe(true);
            });
        });
    });

    describe("Search", () => {
        describe("SET_SEARCH_QUERY", () => {
            it("should set search query and reset matches", () => {
                const state = {
                    ...initialState,
                    searchMatches: [{ pageIndex: 0, charOffset: 0, length: 4, rects: [], context: ["", "test", ""] }],
                    searchActiveIndex: 0,
                };
                const action: Action = { type: "SET_SEARCH_QUERY", query: "new query" };
                const result = reducer(state, action);

                expect(result.searchQuery).toBe("new query");
                expect(result.searchMatches).toHaveLength(0);
                expect(result.searchActiveIndex).toBe(-1);
            });
        });

        describe("SET_SEARCH_CASE_SENSITIVE", () => {
            it("should set case sensitivity and reset matches", () => {
                const state = {
                    ...initialState,
                    searchMatches: [{ pageIndex: 0, charOffset: 0, length: 4, rects: [], context: ["", "test", ""] }],
                };
                const action: Action = { type: "SET_SEARCH_CASE_SENSITIVE", caseSensitive: true };
                const result = reducer(state, action);

                expect(result.searchCaseSensitive).toBe(true);
                expect(result.searchMatches).toHaveLength(0);
            });
        });

        describe("SET_SEARCH_MATCHES", () => {
            it("should set matches and reset active index", () => {
                const matches = [
                    { pageIndex: 0, charOffset: 0, length: 4, rects: [], context: ["", "test", ""] },
                    { pageIndex: 1, charOffset: 10, length: 4, rects: [], context: ["", "test", ""] },
                ];
                const action: Action = { type: "SET_SEARCH_MATCHES", matches };
                const result = reducer(initialState, action);

                expect(result.searchMatches).toEqual(matches);
                expect(result.searchActiveIndex).toBe(0);
            });

            it("should set active index to -1 for empty matches", () => {
                const action: Action = { type: "SET_SEARCH_MATCHES", matches: [] };
                const result = reducer(initialState, action);

                expect(result.searchMatches).toHaveLength(0);
                expect(result.searchActiveIndex).toBe(-1);
            });
        });

        describe("SET_SEARCH_ACTIVE_INDEX", () => {
            it("should set active index", () => {
                const state = {
                    ...initialState,
                    searchMatches: [
                        { pageIndex: 0, charOffset: 0, length: 4, rects: [], context: ["", "test", ""] },
                        { pageIndex: 1, charOffset: 10, length: 4, rects: [], context: ["", "test", ""] },
                    ],
                };
                const action: Action = { type: "SET_SEARCH_ACTIVE_INDEX", index: 1 };
                const result = reducer(state, action);

                expect(result.searchActiveIndex).toBe(1);
            });

            it("should not set invalid index", () => {
                const state = {
                    ...initialState,
                    searchMatches: [{ pageIndex: 0, charOffset: 0, length: 4, rects: [], context: ["", "test", ""] }],
                    searchActiveIndex: 0,
                };
                const action: Action = { type: "SET_SEARCH_ACTIVE_INDEX", index: 5 };
                const result = reducer(state, action);

                expect(result.searchActiveIndex).toBe(0);
            });

            it("should not set negative index", () => {
                const state = {
                    ...initialState,
                    searchMatches: [{ pageIndex: 0, charOffset: 0, length: 4, rects: [], context: ["", "test", ""] }],
                    searchActiveIndex: 0,
                };
                const action: Action = { type: "SET_SEARCH_ACTIVE_INDEX", index: -1 };
                const result = reducer(state, action);

                expect(result.searchActiveIndex).toBe(0);
            });
        });

        describe("SEARCH_NEXT", () => {
            it("should move to next match", () => {
                const state = {
                    ...initialState,
                    searchMatches: [
                        { pageIndex: 0, charOffset: 0, length: 4, rects: [], context: ["", "test", ""] },
                        { pageIndex: 1, charOffset: 10, length: 4, rects: [], context: ["", "test", ""] },
                    ],
                    searchActiveIndex: 0,
                };
                const action: Action = { type: "SEARCH_NEXT" };
                const result = reducer(state, action);

                expect(result.searchActiveIndex).toBe(1);
            });

            it("should wrap to first match", () => {
                const state = {
                    ...initialState,
                    searchMatches: [
                        { pageIndex: 0, charOffset: 0, length: 4, rects: [], context: ["", "test", ""] },
                        { pageIndex: 1, charOffset: 10, length: 4, rects: [], context: ["", "test", ""] },
                    ],
                    searchActiveIndex: 1,
                };
                const action: Action = { type: "SEARCH_NEXT" };
                const result = reducer(state, action);

                expect(result.searchActiveIndex).toBe(0);
            });

            it("should do nothing if no matches", () => {
                const state = { ...initialState, searchMatches: [], searchActiveIndex: -1 };
                const action: Action = { type: "SEARCH_NEXT" };

                expect(reducer(state, action)).toBe(state);
            });
        });

        describe("SEARCH_PREV", () => {
            it("should move to previous match", () => {
                const state = {
                    ...initialState,
                    searchMatches: [
                        { pageIndex: 0, charOffset: 0, length: 4, rects: [], context: ["", "test", ""] },
                        { pageIndex: 1, charOffset: 10, length: 4, rects: [], context: ["", "test", ""] },
                    ],
                    searchActiveIndex: 1,
                };
                const action: Action = { type: "SEARCH_PREV" };
                const result = reducer(state, action);

                expect(result.searchActiveIndex).toBe(0);
            });

            it("should wrap to last match", () => {
                const state = {
                    ...initialState,
                    searchMatches: [
                        { pageIndex: 0, charOffset: 0, length: 4, rects: [], context: ["", "test", ""] },
                        { pageIndex: 1, charOffset: 10, length: 4, rects: [], context: ["", "test", ""] },
                    ],
                    searchActiveIndex: 0,
                };
                const action: Action = { type: "SEARCH_PREV" };
                const result = reducer(state, action);

                expect(result.searchActiveIndex).toBe(1);
            });
        });

        describe("CLEAR_SEARCH", () => {
            it("should clear search state", () => {
                const state = {
                    ...initialState,
                    searchQuery: "test",
                    searchMatches: [{ pageIndex: 0, charOffset: 0, length: 4, rects: [], context: ["", "test", ""] }],
                    searchActiveIndex: 0,
                };
                const action: Action = { type: "CLEAR_SEARCH" };
                const result = reducer(state, action);

                expect(result.searchQuery).toBe("");
                expect(result.searchMatches).toHaveLength(0);
                expect(result.searchActiveIndex).toBe(-1);
            });

            it("should return same state if already cleared", () => {
                const state = {
                    ...initialState,
                    searchQuery: "",
                    searchMatches: [],
                    searchActiveIndex: -1,
                };
                const action: Action = { type: "CLEAR_SEARCH" };

                expect(reducer(state, action)).toBe(state);
            });
        });

        describe("SET_SEARCH_TEXT_LOADING", () => {
            it("should set search text loading", () => {
                const action: Action = { type: "SET_SEARCH_TEXT_LOADING", loading: true };
                const result = reducer(initialState, action);

                expect(result.searchTextLoading).toBe(true);
            });
        });

        describe("SET_SEARCH_TEXT_LOADED", () => {
            it("should set search text loaded", () => {
                const action: Action = { type: "SET_SEARCH_TEXT_LOADED", loaded: true };
                const result = reducer(initialState, action);

                expect(result.searchTextLoaded).toBe(true);
            });
        });
    });

    describe("Download progress", () => {
        describe("SET_DOWNLOAD_PROGRESS", () => {
            it("should set download progress", () => {
                const action: Action = { type: "SET_DOWNLOAD_PROGRESS", loaded: 500, total: 1000 };
                const result = reducer(initialState, action);

                expect(result.isDownloading).toBe(true);
                expect(result.downloadLoaded).toBe(500);
                expect(result.downloadTotal).toBe(1000);
            });
        });

        describe("CLEAR_DOWNLOAD_PROGRESS", () => {
            it("should clear download progress", () => {
                const state = {
                    ...initialState,
                    isDownloading: true,
                    downloadLoaded: 500,
                    downloadTotal: 1000,
                };
                const action: Action = { type: "CLEAR_DOWNLOAD_PROGRESS" };
                const result = reducer(state, action);

                expect(result.isDownloading).toBe(false);
                expect(result.downloadLoaded).toBe(0);
                expect(result.downloadTotal).toBe(0);
            });

            it("should return same state if not downloading", () => {
                const state = { ...initialState, isDownloading: false };
                const action: Action = { type: "CLEAR_DOWNLOAD_PROGRESS" };

                expect(reducer(state, action)).toBe(state);
            });
        });
    });

    describe("__INIT__", () => {
        it("should return state unchanged", () => {
            const action: Action = { type: "__INIT__" };
            const result = reducer(initialState, action);

            expect(result).toBe(initialState);
        });
    });
});
