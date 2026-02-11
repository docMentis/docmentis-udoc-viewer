/**
 * AnnotationPanel - Displays annotations grouped by page in the right panel.
 *
 * Features:
 * - Groups annotations by page
 * - Collapsible page sections
 * - Shows author, status, and content
 * - Collapsible reply threads
 * - Click to navigate to page
 */

import type { Store } from "../../framework/store";
import { subscribeSelector, shallowEqual } from "../../framework/selectors";
import type { ViewerState } from "../state";
import type { Action } from "../actions";
import type { Annotation } from "../annotation";
import { ICON_CHEVRON_DOWN, ICON_CHEVRON_RIGHT, ICON_COMMENTS } from "../icons";

// Icons for annotation types
const ICON_STICKY_NOTE = `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h4l4 4 4-4h4c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>`;
const ICON_HIGHLIGHT = `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>`;
const ICON_UNDERLINE = `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 17c3.31 0 6-2.69 6-6V3h-2.5v8c0 1.93-1.57 3.5-3.5 3.5S8.5 12.93 8.5 11V3H6v8c0 3.31 2.69 6 6 6zm-7 2v2h14v-2H5z"/></svg>`;
const ICON_STRIKEOUT = `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M10 19h4v-3h-4v3zM5 4v3h5v3h4V7h5V4H5zM3 14h18v-2H3v2z"/></svg>`;
const ICON_SQUIGGLY = `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/></svg>`;
const ICON_FREETEXT = `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M2.5 4v3h5v12h3V7h5V4h-13zm19 5h-9v3h3v7h3v-7h3V9z"/></svg>`;
const ICON_SHAPE = `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M2 6v6h6V6H2zm16 0v6h6V6h-6zM7 17l5-5 5 5H7z"/></svg>`;
const ICON_INK = `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a.996.996 0 000-1.41l-2.34-2.34a.996.996 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>`;
const ICON_STAMP = `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg>`;
const ICON_CARET = `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M7 14l5-5 5 5H7z"/></svg>`;
const ICON_REDACT = `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M3 3h18v18H3V3zm2 2v14h14V5H5zm2 2h10v10H7V7z"/></svg>`;

type AnnotationPanelSlice = {
    isOpen: boolean;
    isCommentsTab: boolean;
    annotationsByPage: Map<number, Annotation[]>;
    allAnnotationsLoaded: boolean;
};

/**
 * Filter annotations to only those with metadata (comments).
 */
function filterAnnotationsWithMetadata(annotations: Annotation[]): Annotation[] {
    return annotations.filter(annotation => {
        const meta = annotation.metadata;
        return meta && (meta.author || meta.contents || meta.subject);
    });
}

/**
 * Get icon SVG for annotation type.
 */
function getAnnotationTypeIcon(type: string): string {
    switch (type) {
        case "text":
            return ICON_STICKY_NOTE;
        case "highlight":
            return ICON_HIGHLIGHT;
        case "underline":
            return ICON_UNDERLINE;
        case "strikeOut":
            return ICON_STRIKEOUT;
        case "squiggly":
            return ICON_SQUIGGLY;
        case "freeText":
            return ICON_FREETEXT;
        case "line":
        case "square":
        case "circle":
        case "polygon":
        case "polyLine":
            return ICON_SHAPE;
        case "ink":
            return ICON_INK;
        case "stamp":
            return ICON_STAMP;
        case "caret":
            return ICON_CARET;
        case "redact":
            return ICON_REDACT;
        default:
            return ICON_COMMENTS;
    }
}

export function createAnnotationPanel() {
    const el = document.createElement("div");
    el.className = "udoc-annotation-panel";

    let unsubRender: (() => void) | null = null;
    let storeRef: Store<ViewerState, Action> | null = null;
    let cachedSlice: AnnotationPanelSlice | null = null;

    function renderPlaceholder(): void {
        el.innerHTML = `
            <div class="udoc-annotation-panel__placeholder">
                <div class="udoc-annotation-panel__placeholder-icon">${ICON_COMMENTS}</div>
                <div class="udoc-annotation-panel__placeholder-title">Comments</div>
                <div class="udoc-annotation-panel__placeholder-message">No comments in this document</div>
            </div>
        `;
    }

    function renderLoading(): void {
        el.innerHTML = `
            <div class="udoc-annotation-panel__loading">
                Loading comments...
            </div>
        `;
    }

    function renderCommentItem(
        container: HTMLElement,
        annotation: Annotation,
        pageIndex: number,
        depth: number
    ): void {
        const item = document.createElement("div");
        item.className = depth > 0
            ? `udoc-comment-item udoc-comment-reply udoc-comment-depth-${Math.min(depth, 3)}`
            : "udoc-comment-item";

        // Icon
        const icon = document.createElement("div");
        icon.className = "udoc-comment-icon";
        icon.innerHTML = getAnnotationTypeIcon(annotation.type);
        item.appendChild(icon);

        // Body
        const body = document.createElement("div");
        body.className = "udoc-comment-body";

        // Header with author and status
        const header = document.createElement("div");
        header.className = "udoc-comment-header";

        const meta = annotation.metadata;
        const title = meta?.author || meta?.subject;
        if (title) {
            const titleEl = document.createElement("span");
            titleEl.className = "udoc-comment-author";
            titleEl.textContent = title;
            header.appendChild(titleEl);
        }

        // Status badge
        if (meta?.state) {
            const badge = document.createElement("span");
            badge.className = `udoc-comment-status udoc-comment-status--${meta.state.toLowerCase()}`;
            badge.textContent = meta.state;
            header.appendChild(badge);
        }

        body.appendChild(header);

        // Contents
        if (meta?.contents) {
            const contents = document.createElement("div");
            contents.className = "udoc-comment-contents";
            contents.textContent = meta.contents;
            body.appendChild(contents);
        }

        // Reply toggle button
        if (annotation.replies && annotation.replies.length > 0) {
            const toggleBtn = document.createElement("button");
            toggleBtn.className = "udoc-comment-toggle";
            toggleBtn.innerHTML = `${ICON_CHEVRON_RIGHT}<span>${annotation.replies.length} ${annotation.replies.length === 1 ? "reply" : "replies"}</span>`;
            toggleBtn.title = "Show replies";
            body.appendChild(toggleBtn);
        }

        item.appendChild(body);

        // Click to navigate and highlight
        item.addEventListener("click", (e) => {
            e.stopPropagation();
            if (storeRef) {
                // Navigate to the page
                storeRef.dispatch({ type: "NAVIGATE_TO_PAGE", page: pageIndex + 1 });
                // Highlight the annotation on the page
                storeRef.dispatch({
                    type: "HIGHLIGHT_ANNOTATION",
                    pageIndex,
                    bounds: annotation.bounds
                });
            }
        });

        container.appendChild(item);

        // Render replies (collapsed by default)
        if (annotation.replies && annotation.replies.length > 0) {
            const toggleBtn = body.querySelector(".udoc-comment-toggle") as HTMLButtonElement;

            const repliesContainer = document.createElement("div");
            repliesContainer.className = "udoc-comment-replies udoc-comment-replies--collapsed";
            for (const reply of annotation.replies) {
                renderCommentItem(repliesContainer, reply, pageIndex, depth + 1);
            }
            container.appendChild(repliesContainer);

            toggleBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                const isCollapsed = repliesContainer.classList.contains("udoc-comment-replies--collapsed");
                if (isCollapsed) {
                    repliesContainer.classList.remove("udoc-comment-replies--collapsed");
                    toggleBtn.classList.add("udoc-comment-toggle--expanded");
                    toggleBtn.title = "Hide replies";
                } else {
                    repliesContainer.classList.add("udoc-comment-replies--collapsed");
                    toggleBtn.classList.remove("udoc-comment-toggle--expanded");
                    toggleBtn.title = "Show replies";
                }
            });
        }
    }

    function render(slice: AnnotationPanelSlice): void {
        if (!slice.isOpen || !slice.isCommentsTab) {
            el.style.display = "none";
            return;
        }
        el.style.display = "";

        // Check if still loading
        if (!slice.allAnnotationsLoaded) {
            renderLoading();
            return;
        }

        // Collect annotations with metadata across all pages
        const annotationsByPage = new Map<number, Annotation[]>();
        for (const [pageIndex, annotations] of slice.annotationsByPage) {
            const filtered = filterAnnotationsWithMetadata(annotations);
            if (filtered.length > 0) {
                annotationsByPage.set(pageIndex, filtered);
            }
        }

        if (annotationsByPage.size === 0) {
            renderPlaceholder();
            return;
        }

        el.innerHTML = "";

        const list = document.createElement("div");
        list.className = "udoc-comments-list";

        // Sort pages by index
        const sortedPages = Array.from(annotationsByPage.keys()).sort((a, b) => a - b);

        for (const pageIndex of sortedPages) {
            const annotations = annotationsByPage.get(pageIndex)!;

            // Page group
            const pageGroup = document.createElement("div");
            pageGroup.className = "udoc-comments-page-group";

            // Page header
            const pageHeader = document.createElement("div");
            pageHeader.className = "udoc-comments-page-header";
            pageHeader.innerHTML = `${ICON_CHEVRON_DOWN}<span>Page ${pageIndex + 1}</span><span class="udoc-comments-page-count">${annotations.length}</span>`;
            pageGroup.appendChild(pageHeader);

            // Page content
            const pageContent = document.createElement("div");
            pageContent.className = "udoc-comments-page-content";

            for (const annotation of annotations) {
                renderCommentItem(pageContent, annotation, pageIndex, 0);
            }

            pageGroup.appendChild(pageContent);

            // Toggle click handler
            pageHeader.addEventListener("click", () => {
                const isCollapsed = pageGroup.classList.contains("udoc-comments-page-group--collapsed");
                if (isCollapsed) {
                    pageGroup.classList.remove("udoc-comments-page-group--collapsed");
                } else {
                    pageGroup.classList.add("udoc-comments-page-group--collapsed");
                }
            });

            list.appendChild(pageGroup);
        }

        el.appendChild(list);
    }

    function applyState(slice: AnnotationPanelSlice): void {
        // Skip if unchanged (deep comparison for Map is expensive, so rely on selector memoization)
        cachedSlice = slice;
        render(slice);
    }

    function mount(container: HTMLElement, store: Store<ViewerState, Action>): void {
        container.appendChild(el);
        storeRef = store;

        applyState(selectAnnotationPanel(store.getState()));
        unsubRender = subscribeSelector(store, selectAnnotationPanel, applyState, {
            equality: annotationPanelEqual
        });
    }

    function destroy(): void {
        if (unsubRender) unsubRender();
        storeRef = null;
        el.remove();
    }

    return { el, mount, destroy };
}

function selectAnnotationPanel(state: ViewerState): AnnotationPanelSlice {
    const isCommentsTab = state.activePanel === "comments";
    const isOpen = isCommentsTab;

    // Check if we have annotations for all pages
    const allAnnotationsLoaded = state.doc !== null &&
        state.pageCount > 0 &&
        state.pageAnnotations.size >= state.pageCount;

    return {
        isOpen,
        isCommentsTab,
        annotationsByPage: state.pageAnnotations,
        allAnnotationsLoaded
    };
}

function annotationPanelEqual(a: AnnotationPanelSlice, b: AnnotationPanelSlice): boolean {
    if (a.isOpen !== b.isOpen) return false;
    if (a.isCommentsTab !== b.isCommentsTab) return false;
    if (a.allAnnotationsLoaded !== b.allAnnotationsLoaded) return false;
    if (a.annotationsByPage !== b.annotationsByPage) return false;
    return true;
}
