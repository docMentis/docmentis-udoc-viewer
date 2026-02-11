import type { Store } from "../../framework/store";
import { subscribeSelector, shallowEqual } from "../../framework/selectors";
import type { ViewerState, PageInfo } from "../state";
import { getPointsToPixels } from "../state";
import type { Action } from "../actions";
import type { WorkerClient } from "../../../worker/index.js";
import { getDevicePixelRatio } from "../layout";

const THUMBNAIL_WIDTH = 150; // Fixed width in CSS pixels

interface ThumbnailItem {
    container: HTMLDivElement;
    canvas: HTMLCanvasElement;
    pageNumber: number;
    renderKey: string;
    pendingKey: string | null;
    renderToken: number;
}

type ThumbnailSlice = {
    docId: string | null;
    pageCount: number;
    pageInfos: readonly PageInfo[];
    currentPage: number;
    dpi: number;
};

function selectThumbnailSlice(state: ViewerState): ThumbnailSlice {
    return {
        docId: state.doc?.id ?? null,
        pageCount: state.pageCount,
        pageInfos: state.pageInfos,
        currentPage: state.page,
        dpi: state.dpi
    };
}

export function createThumbnailPanel() {
    const el = document.createElement("div");
    el.className = "udoc-thumbnail-panel";

    let mounted = false;
    let storeRef: Store<ViewerState, Action> | null = null;
    let workerClient: WorkerClient | null = null;
    let thumbnailItems: ThumbnailItem[] = [];
    let intersectionObserver: IntersectionObserver | null = null;
    let currentSlice: ThumbnailSlice | null = null;

    let unsubRender: (() => void) | null = null;
    const unsubEvents: Array<() => void> = [];

    function createThumbnailItem(pageNumber: number, pageInfo: PageInfo): ThumbnailItem {
        const container = document.createElement("div");
        container.className = "udoc-thumbnail-item";
        container.dataset.page = String(pageNumber);

        const canvas = document.createElement("canvas");
        canvas.className = "udoc-thumbnail-item__canvas";

        // Set aspect ratio for responsive scaling
        const aspectRatio = pageInfo.width / pageInfo.height;
        canvas.style.aspectRatio = String(aspectRatio);
        canvas.style.width = `${THUMBNAIL_WIDTH}px`;

        container.appendChild(canvas);

        const label = document.createElement("div");
        label.className = "udoc-thumbnail-item__label";
        label.textContent = String(pageNumber);
        container.appendChild(label);

        // Click handler for navigation
        const onClick = () => {
            if (storeRef) {
                storeRef.dispatch({ type: "NAVIGATE_TO_PAGE", page: pageNumber });
            }
        };
        container.addEventListener("click", onClick);
        unsubEvents.push(() => container.removeEventListener("click", onClick));

        return {
            container,
            canvas,
            pageNumber,
            renderKey: "",
            pendingKey: null,
            renderToken: 0
        };
    }

    function buildThumbnailList(slice: ThumbnailSlice): void {
        // Clear existing
        for (const item of thumbnailItems) {
            item.container.remove();
        }
        thumbnailItems = [];

        if (!slice.docId || slice.pageCount === 0) return;

        // Default page size if not available
        const defaultPageInfo: PageInfo = { width: 612, height: 792, rotation: 0 };

        // Create thumbnail items for each page
        for (let i = 1; i <= slice.pageCount; i++) {
            const pageInfo = slice.pageInfos[i - 1] || defaultPageInfo;
            const item = createThumbnailItem(i, pageInfo);
            thumbnailItems.push(item);
            el.appendChild(item.container);
        }

        // Setup intersection observer for lazy loading
        setupIntersectionObserver();

        // Highlight current page
        updateCurrentPageHighlight(slice.currentPage);
    }

    function setupIntersectionObserver(): void {
        if (intersectionObserver) {
            intersectionObserver.disconnect();
        }

        intersectionObserver = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    if (entry.isIntersecting) {
                        const pageNumber = parseInt(
                            (entry.target as HTMLElement).dataset.page || "0",
                            10
                        );
                        if (pageNumber > 0) {
                            requestThumbnailRender(pageNumber);
                        }
                    }
                }
            },
            {
                root: el,
                rootMargin: "100px 0px",
                threshold: 0
            }
        );

        for (const item of thumbnailItems) {
            intersectionObserver.observe(item.container);
        }

        // Setup scroll handler for boost priority
        setupScrollHandler();
    }

    function setupScrollHandler(): void {
        const onScroll = () => {
            if (!workerClient || !currentSlice?.docId) return;

            const focusPage = findFocusThumbnail();
            if (focusPage !== null) {
                workerClient.boostThumbnailRenderPriority(currentSlice.docId, focusPage);
            }
        };

        el.addEventListener("scroll", onScroll, { passive: true });
        unsubEvents.push(() => el.removeEventListener("scroll", onScroll));
    }

    function findFocusThumbnail(): number | null {
        if (thumbnailItems.length === 0) return null;

        const panelRect = el.getBoundingClientRect();
        const panelCenter = panelRect.top + panelRect.height / 2;

        let closestPage: number | null = null;
        let closestDistance = Infinity;

        for (const item of thumbnailItems) {
            const itemRect = item.container.getBoundingClientRect();
            const itemCenter = itemRect.top + itemRect.height / 2;
            const distance = Math.abs(itemCenter - panelCenter);

            if (distance < closestDistance) {
                closestDistance = distance;
                closestPage = item.pageNumber;
            }
        }

        return closestPage;
    }

    async function requestThumbnailRender(pageNumber: number): Promise<void> {
        const item = thumbnailItems[pageNumber - 1];
        if (!item || !workerClient || !currentSlice || !currentSlice.docId) return;

        const pageInfo = currentSlice.pageInfos[pageNumber - 1];
        if (!pageInfo) return;

        const dpr = getDevicePixelRatio();
        const pointsToPixels = getPointsToPixels(currentSlice.dpi);
        const scale = THUMBNAIL_WIDTH / (pageInfo.width * pointsToPixels);
        const renderScale = scale * pointsToPixels * dpr;

        const key = `${currentSlice.docId}:${pageNumber}:${renderScale.toFixed(4)}`;
        if (item.renderKey === key || item.pendingKey === key) return;

        const token = ++item.renderToken;
        item.pendingKey = key;

        try {
            const result = await workerClient.requestRender({
                docId: currentSlice.docId,
                page: pageNumber,
                type: "thumbnail",
                scale: renderScale
            });

            if (!mounted || item.renderToken !== token) {
                if (item.pendingKey === key) item.pendingKey = null;
                return;
            }

            const canvas = item.canvas;
            if (canvas.width !== result.width) canvas.width = result.width;
            if (canvas.height !== result.height) canvas.height = result.height;

            const ctx = canvas.getContext("2d");
            if (ctx) {
                ctx.drawImage(result.bitmap, 0, 0);
            }

            item.renderKey = key;
        } catch (error) {
            if ((error as Error).message !== "Request cancelled") {
                console.error(`Thumbnail render failed for page ${pageNumber}:`, error);
            }
        } finally {
            if (item.pendingKey === key) item.pendingKey = null;
        }
    }

    function updateCurrentPageHighlight(currentPage: number): void {
        for (const item of thumbnailItems) {
            const isActive = item.pageNumber === currentPage;
            item.container.classList.toggle("udoc-thumbnail-item--active", isActive);
        }
    }

    function scrollActiveIntoView(currentPage: number): void {
        const item = thumbnailItems[currentPage - 1];
        if (!item) return;

        // Use instant scroll to avoid triggering renders for all intermediate thumbnails
        item.container.scrollIntoView({
            behavior: "instant",
            block: "nearest"
        });
    }

    function applyState(slice: ThumbnailSlice): void {
        const docChanged = !currentSlice ||
            slice.docId !== currentSlice.docId ||
            slice.pageCount !== currentSlice.pageCount ||
            slice.pageInfos !== currentSlice.pageInfos;

        if (docChanged) {
            buildThumbnailList(slice);
        } else if (slice.currentPage !== currentSlice?.currentPage) {
            updateCurrentPageHighlight(slice.currentPage);
            scrollActiveIntoView(slice.currentPage);
        }

        currentSlice = slice;
    }

    function mount(
        container: HTMLElement,
        store: Store<ViewerState, Action>,
        rm: WorkerClient
    ): void {
        container.appendChild(el);
        mounted = true;
        storeRef = store;
        workerClient = rm;

        // Apply initial state (currentSlice is null, so docChanged will be true)
        applyState(selectThumbnailSlice(store.getState()));

        unsubRender = subscribeSelector(
            store,
            selectThumbnailSlice,
            applyState,
            { equality: shallowEqual }
        );
    }

    function destroy(): void {
        mounted = false;

        if (unsubRender) unsubRender();
        for (const off of unsubEvents) off();
        unsubEvents.length = 0;

        if (intersectionObserver) {
            intersectionObserver.disconnect();
            intersectionObserver = null;
        }

        thumbnailItems = [];
        storeRef = null;
        workerClient = null;
        currentSlice = null;

        el.remove();
    }

    return { el, mount, destroy };
}

export type ThumbnailPanelComponent = ReturnType<typeof createThumbnailPanel>;
