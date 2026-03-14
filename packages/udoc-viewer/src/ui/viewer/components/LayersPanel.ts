import type { Store } from "../../framework/store";
import { subscribeSelector, shallowEqual } from "../../framework/selectors";
import type { ViewerState, VisibilityGroup } from "../state";
import type { Action } from "../actions";
import type { WorkerClient } from "../../../worker/index.js";
import { ICON_VISIBILITY, ICON_VISIBILITY_OFF, ICON_LOCK } from "../icons";

type LayersSlice = {
    groups: VisibilityGroup[] | null;
    loading: boolean;
    docId: string | null;
};

function selectLayersSlice(state: ViewerState): LayersSlice {
    return {
        groups: state.visibilityGroups,
        loading: state.visibilityGroupsLoading,
        docId: state.doc?.id ?? null,
    };
}

export function createLayersPanel() {
    const el = document.createElement("div");
    el.className = "udoc-layers-panel";

    let storeRef: Store<ViewerState, Action> | null = null;
    let workerClientRef: WorkerClient | null = null;
    let currentSlice: LayersSlice | null = null;

    let unsubRender: (() => void) | null = null;
    const unsubEvents: Array<() => void> = [];

    function renderGroups(groups: VisibilityGroup[]): void {
        el.innerHTML = "";

        if (groups.length === 0) {
            const empty = document.createElement("div");
            empty.className = "udoc-layers-panel__empty";
            empty.textContent = "No layers in this document";
            el.appendChild(empty);
            return;
        }

        for (const group of groups) {
            const item = document.createElement("div");
            item.className = "udoc-layers-panel__item";
            if (group.locked) {
                item.classList.add("udoc-layers-panel__item--locked");
            }

            const toggle = document.createElement("button");
            toggle.className = "udoc-layers-panel__toggle";
            toggle.type = "button";
            toggle.setAttribute("aria-label", group.visible ? "Hide layer" : "Show layer");
            toggle.innerHTML = group.visible ? ICON_VISIBILITY : ICON_VISIBILITY_OFF;
            toggle.classList.toggle("udoc-layers-panel__toggle--hidden", !group.visible);
            if (group.locked) {
                toggle.disabled = true;
            }

            const label = document.createElement("span");
            label.className = "udoc-layers-panel__label";
            label.textContent = group.name;
            if (!group.visible) {
                label.classList.add("udoc-layers-panel__label--hidden");
            }

            if (!group.locked) {
                const onClick = async () => {
                    if (!storeRef || !workerClientRef) return;
                    const state = storeRef.getState();
                    if (!state.doc) return;

                    const newVisible = !group.visible;

                    // Update engine state
                    await workerClientRef.setVisibilityGroupVisible(state.doc.id, group.id, newVisible);

                    // Update UI state
                    storeRef.dispatch({ type: "SET_VISIBILITY_GROUP_VISIBLE", groupId: group.id, visible: newVisible });

                    // Invalidate render cache — Viewport subscribes to this and re-renders
                    workerClientRef.invalidateRenderCache(state.doc.id, "page");
                };
                toggle.addEventListener("click", onClick);
                unsubEvents.push(() => toggle.removeEventListener("click", onClick));

                label.addEventListener("click", onClick);
                unsubEvents.push(() => label.removeEventListener("click", onClick));
            }

            item.append(toggle, label);

            if (group.locked) {
                const lockIcon = document.createElement("span");
                lockIcon.className = "udoc-layers-panel__lock";
                lockIcon.innerHTML = ICON_LOCK;
                item.appendChild(lockIcon);
            }

            el.appendChild(item);
        }
    }

    function showLoading(): void {
        el.innerHTML = "";
        const loading = document.createElement("div");
        loading.className = "udoc-layers-panel__loading";
        loading.textContent = "Loading layers...";
        el.appendChild(loading);
    }

    function applyState(slice: LayersSlice): void {
        const changed = !currentSlice || slice.groups !== currentSlice.groups || slice.loading !== currentSlice.loading;

        if (changed) {
            // Clear old event listeners when rebuilding
            for (const off of unsubEvents) off();
            unsubEvents.length = 0;

            if (slice.loading) {
                showLoading();
            } else if (slice.groups === null) {
                el.innerHTML = "";
            } else {
                renderGroups(slice.groups);
            }
        }

        currentSlice = slice;
    }

    function mount(container: HTMLElement, store: Store<ViewerState, Action>, workerClient: WorkerClient): void {
        container.appendChild(el);
        storeRef = store;
        workerClientRef = workerClient;

        applyState(selectLayersSlice(store.getState()));
        unsubRender = subscribeSelector(store, selectLayersSlice, applyState, { equality: shallowEqual });
    }

    function destroy(): void {
        if (unsubRender) unsubRender();
        for (const off of unsubEvents) off();
        unsubEvents.length = 0;

        storeRef = null;
        workerClientRef = null;
        currentSlice = null;

        el.remove();
    }

    return { el, mount, destroy };
}

export type LayersPanelComponent = ReturnType<typeof createLayersPanel>;
