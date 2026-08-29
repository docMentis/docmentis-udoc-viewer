<template>
  <div ref="containerRef" class="document-viewer"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, nextTick } from "vue";
import { UDocClient, type PerformanceLogEntry } from "@docmentis/udoc-viewer";

/**
 * DocumentViewer Component with Performance Tracking
 *
 * This component wraps UDocViewer and exposes performance metrics
 * through the PerformanceCounter API. It uses the slot mechanism
 * to add a custom performance button to the toolbar.
 */

const props = defineProps<{
  url: string;
}>();

const emit = defineEmits<{
  performanceUpdate: [entries: PerformanceLogEntry[]];
  viewerReady: [viewer: any];
  togglePerformance: [];
}>();

const containerRef = ref<HTMLDivElement>();
let client: any = null;
let viewer: any = null;
let isMounted = false;
let performanceButton: HTMLButtonElement | null = null;

/**
 * Initialize the UDoc viewer and setup performance monitoring
 */
async function initViewer() {
  if (!containerRef.value || !isMounted) return;

  try {
    client = await UDocClient.create();

    if (!isMounted) {
      client.destroy();
      return;
    }

    viewer = await client.createViewer({
      container: containerRef.value,
      enablePerformanceCounter: true,  // Enable performance tracking
    });

    if (!isMounted) {
      viewer.destroy();
      client.destroy();
      return;
    }

    await viewer.load(props.url);

    if (!isMounted) return;

    // Subscribe to performance updates
    const performanceCounter = viewer.performanceCounter;
    if (performanceCounter && performanceCounter.enabled) {
      performanceCounter.onLog((entry: PerformanceLogEntry) => {
        emit("performanceUpdate", [...performanceCounter.entries]);
      });
    }

    // Add custom performance button to toolbar using slot mechanism
    await nextTick();
    addPerformanceButtonToToolbar();

    emit("viewerReady", viewer);
  } catch (error) {
    console.error("Failed to initialize UDoc Viewer:", error);
  }
}

/**
 * Add performance button to the viewer toolbar using slot mechanism
 * 
 * The slot mechanism allows inserting custom UI into predefined slots:
 * - .udoc-toolbar-slot: The toolbar container
 * - .udoc-toolbar__right: The right section of toolbar (contains search, print, etc.)
 */
function addPerformanceButtonToToolbar() {
  if (!containerRef.value) return;

  // Method 1: Try to find the toolbar right section directly
  let toolbarRight = containerRef.value.querySelector('.udoc-toolbar__right');
  
  // Method 2: If not found, try to find toolbar slot first
  if (!toolbarRight) {
    const toolbarSlot = containerRef.value.querySelector('.udoc-toolbar-slot');
    if (toolbarSlot) {
      // The toolbar component is mounted inside toolbarSlot
      // Find the right section within it
      toolbarRight = toolbarSlot.querySelector('.udoc-toolbar__right');
    }
  }

  // Method 3: Try to find toolbar root
  if (!toolbarRight) {
    const toolbarRoot = containerRef.value.querySelector('.udoc-toolbar');
    if (toolbarRoot) {
      toolbarRight = toolbarRoot.querySelector('.udoc-toolbar__right');
    }
  }

  if (!toolbarRight) {
    console.warn('Toolbar right section not found, performance button will not be added');
    return;
  }

  // Create performance button matching the toolbar button style
  performanceButton = document.createElement('button');
  performanceButton.className = 'udoc-toolbar__btn udoc-toolbar__btn--performance';
  performanceButton.setAttribute('aria-label', 'Performance Monitor');
  performanceButton.setAttribute('title', 'Performance Monitor');
  performanceButton.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M3 3v18h18"/>
      <path d="M18 9l-5 5-4-4-3 3"/>
    </svg>
  `;

  // Add click handler
  performanceButton.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    emit("togglePerformance");
  });

  // Insert before the overflow menu (last element) or append to end
  const overflowMenu = toolbarRight.querySelector('.udoc-overflow-menu');
  if (overflowMenu) {
    toolbarRight.insertBefore(performanceButton, overflowMenu);
  } else {
    toolbarRight.appendChild(performanceButton);
  }
}

/**
 * Remove performance button from toolbar
 */
function removePerformanceButton() {
  if (performanceButton && performanceButton.parentNode) {
    performanceButton.parentNode.removeChild(performanceButton);
    performanceButton = null;
  }
}

/**
 * Get current performance summary
 */
function getPerformanceSummary() {
  if (!viewer) return null;
  const counter = viewer.performanceCounter;
  return counter && counter.enabled ? counter.getSummary() : null;
}

/**
 * Get all performance entries
 */
function getPerformanceEntries(): PerformanceLogEntry[] {
  if (!viewer) return [];
  const counter = viewer.performanceCounter;
  return counter && counter.enabled ? counter.entries : [];
}

/**
 * Reset performance counter
 */
function resetPerformance() {
  if (!viewer) return;
  const counter = viewer.performanceCounter;
  if (counter && counter.enabled) {
    counter.reset();
    emit("performanceUpdate", []);
  }
}

/**
 * Export performance data as JSON
 */
function exportPerformanceData(): string {
  const summary = getPerformanceSummary();
  const entries = getPerformanceEntries();
  
  return JSON.stringify({
    timestamp: new Date().toISOString(),
    summary,
    entries,
    userAgent: navigator.userAgent,
    url: props.url,
  }, null, 2);
}

/**
 * Expose methods for parent components
 */
defineExpose({
  getPerformanceSummary,
  getPerformanceEntries,
  resetPerformance,
  exportPerformanceData,
});

onMounted(() => {
  isMounted = true;
  initViewer();
});

onBeforeUnmount(() => {
  isMounted = false;
  removePerformanceButton();
  viewer?.destroy();
  client?.destroy();
});

watch(
  () => props.url,
  async (newUrl) => {
    if (viewer) {
      resetPerformance();
      await viewer.load(newUrl);
    }
  }
);
</script>

<style scoped>
.document-viewer {
  width: 100%;
  height: 100%;
}

/* Style the performance button to match toolbar buttons */
:deep(.udoc-toolbar__btn--performance) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  background: transparent;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  color: var(--udoc-text-secondary, rgba(0, 0, 0, 0.7));
  transition: background-color 0.15s, color 0.15s;
}

:deep(.udoc-toolbar__btn--performance:hover) {
  background: var(--udoc-hover-overlay, rgba(0, 0, 0, 0.08));
}

:deep(.udoc-toolbar__btn--performance:active) {
  background: var(--udoc-active-overlay, rgba(0, 0, 0, 0.12));
}

:deep(.udoc-toolbar__btn--performance svg) {
  width: 18px;
  height: 18px;
}
</style>
