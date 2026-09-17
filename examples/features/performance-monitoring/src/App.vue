<template>
  <div class="app-container">
    <main class="app-main">
      <div class="viewer-section">
        <DocumentViewer
          ref="viewerRef"
          :url="documentUrl"
          @performance-update="handlePerformanceUpdate"
          @viewer-ready="handleViewerReady"
          @toggle-performance="togglePerformancePanel"
        />
      </div>

      <Transition name="slide-left">
        <aside v-if="showPerformancePanel" class="performance-section">
          <PerformancePanel
            :entries="performanceEntries"
            :summary="performanceSummary"
            @reset="handleReset"
            @export="handleExport"
          />
        </aside>
      </Transition>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import DocumentViewer from "./components/DocumentViewer.vue";
import PerformancePanel from "./components/PerformancePanel.vue";
import type { PerformanceLogEntry, PerformanceCounterSummary } from "@docmentis/udoc-viewer";

/**
 * Performance Monitoring Example App
 *
 * This example demonstrates how to use the PerformanceCounter API
 * to monitor and analyze document viewer performance.
 *
 * Features:
 * - Real-time performance tracking
 * - Summary statistics by operation type
 * - Timeline of recent events
 * - Export performance data as JSON
 * - Toggle panel via toolbar button (using slot mechanism)
 */

const documentUrl = "/sample.pdf";

const viewerRef = ref<InstanceType<typeof DocumentViewer> | null>(null);
const performanceEntries = ref<PerformanceLogEntry[]>([]);
const performanceSummary = ref<PerformanceCounterSummary | null>(null);
const showPerformancePanel = ref(false);

/**
 * Toggle performance panel visibility
 */
function togglePerformancePanel() {
  showPerformancePanel.value = !showPerformancePanel.value;
}

/**
 * Handle performance updates from the viewer
 */
function handlePerformanceUpdate(entries: PerformanceLogEntry[]) {
  performanceEntries.value = entries;
  
  // Update summary
  if (viewerRef.value) {
    performanceSummary.value = viewerRef.value.getPerformanceSummary();
  }
}

/**
 * Handle viewer ready event
 */
function handleViewerReady(viewer: any) {
  console.log("Viewer is ready:", viewer);
  
  // Get initial performance summary
  if (viewerRef.value) {
    performanceSummary.value = viewerRef.value.getPerformanceSummary();
  }
}

/**
 * Reset performance metrics
 */
function handleReset() {
  if (viewerRef.value) {
    viewerRef.value.resetPerformance();
    performanceEntries.value = [];
    performanceSummary.value = null;
  }
}

/**
 * Export performance data as JSON
 */
function handleExport() {
  if (!viewerRef.value) return;
  
  const data = viewerRef.value.exportPerformanceData();
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement("a");
  a.href = url;
  a.download = `performance-report-${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html,
body,
#app {
  height: 100%;
  overflow: hidden;
}
</style>

<style scoped>
.app-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #f5f5f5;
}

.app-main {
  flex: 1;
  display: flex;
  overflow: hidden;
  position: relative;
}

.viewer-section {
  flex: 1;
  overflow: hidden;
  background: #fff;
}

.performance-section {
  width: 380px;
  flex-shrink: 0;
  overflow: hidden;
  border-left: 1px solid #e0e0e0;
  background: #fff;
  box-shadow: -2px 0 8px rgba(0, 0, 0, 0.1);
}

/* Slide transition */
.slide-left-enter-active,
.slide-left-leave-active {
  transition: all 0.3s ease;
}

.slide-left-enter-from,
.slide-left-leave-to {
  transform: translateX(100%);
  opacity: 0;
}

@media (max-width: 1024px) {
  .performance-section {
    position: absolute;
    right: 0;
    top: 0;
    bottom: 0;
    width: 100%;
    max-width: 400px;
    z-index: 100;
  }
}
</style>
