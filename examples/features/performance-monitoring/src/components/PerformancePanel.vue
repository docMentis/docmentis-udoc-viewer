<template>
  <div class="performance-panel">
    <div class="panel-header">
      <h2>Performance Monitor</h2>
      <div class="header-actions">
        <button class="action-btn primary" @click="handleExport" title="Export as JSON">
          Export
        </button>
      </div>
    </div>

    <div v-if="summary" class="panel-content">
      <div class="summary-section">
        <h3>Summary</h3>
        <div class="summary-grid">
          <div class="summary-card">
            <div class="card-label">Total Events</div>
            <div class="card-value">{{ totalEvents }}</div>
          </div>
          <div class="summary-card">
            <div class="card-label">Total Duration</div>
            <div class="card-value">{{ formatDuration(totalDuration) }}</div>
          </div>
          <div class="summary-card">
            <div class="card-label">Avg Duration</div>
            <div class="card-value">{{ formatDuration(avgDuration) }}</div>
          </div>
        </div>
      </div>

      <div class="breakdown-section">
        <h3>Breakdown by Operation</h3>
        <div class="breakdown-list">
          <div
            v-for="(stats, type) in summary.breakdown"
            :key="type"
            class="breakdown-item"
          >
            <div class="breakdown-header">
              <span class="operation-name">{{ formatOperationName(type) }}</span>
              <span class="operation-count">{{ stats.count }} calls</span>
            </div>
            <div class="breakdown-stats">
              <div class="stat">
                <span class="stat-label">Avg:</span>
                <span class="stat-value">{{ formatDuration(stats.avgDuration) }}</span>
              </div>
              <div class="stat">
                <span class="stat-label">Min:</span>
                <span class="stat-value">{{ formatDuration(stats.minDuration) }}</span>
              </div>
              <div class="stat">
                <span class="stat-label">Max:</span>
                <span class="stat-value">{{ formatDuration(stats.maxDuration) }}</span>
              </div>
              <div class="stat">
                <span class="stat-label">Total:</span>
                <span class="stat-value">{{ formatDuration(stats.totalDuration) }}</span>
              </div>
            </div>
            <div class="breakdown-bar">
              <div
                class="bar-fill"
                :style="{ width: getBarWidth(stats.totalDuration) }"
              ></div>
            </div>
          </div>
        </div>
      </div>

      <div class="timeline-section">
        <h3>Recent Events (Last 20)</h3>
        <div class="timeline-list">
          <div
            v-for="(entry, index) in recentEntries"
            :key="index"
            class="timeline-item"
            :class="entry.phase"
          >
            <div class="timeline-marker"></div>
            <div class="timeline-content">
              <div class="timeline-header">
                <span class="timeline-type">{{ formatOperationName(entry.type) }}</span>
                <span class="timeline-phase">{{ entry.phase }}</span>
              </div>
              <div v-if="entry.phase === 'end'" class="timeline-details">
                <span class="timeline-duration">{{ formatDuration(entry.duration) }}</span>
                <span v-if="entry.success === false" class="timeline-error">
                  {{ entry.error || 'Failed' }}
                </span>
              </div>
              <div v-if="entry.context" class="timeline-context">
                {{ formatContext(entry.context) }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="empty-state">
      <div class="empty-icon">📊</div>
      <p>No performance data yet</p>
      <p class="empty-hint">Load a document to see performance metrics</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { PerformanceLogEntry, PerformanceCounterSummary } from "@docmentis/udoc-viewer";

/**
 * PerformancePanel Component
 *
 * Displays performance metrics collected by PerformanceCounter:
 * - Summary statistics (total events, duration, average)
 * - Breakdown by operation type
 * - Timeline of recent events
 * - Export functionality
 */

const props = defineProps<{
  entries: PerformanceLogEntry[];
  summary: PerformanceCounterSummary | null;
}>();

const emit = defineEmits<{
  export: [];
}>();

/**
 * Computed properties for summary
 */
const totalEvents = computed(() => {
  if (!props.summary) return 0;
  return Object.values(props.summary.breakdown).reduce(
    (sum, stats) => sum + stats.count,
    0
  );
});

const totalDuration = computed(() => {
  if (!props.summary) return 0;
  return Object.values(props.summary.breakdown).reduce(
    (sum, stats) => sum + stats.totalDuration,
    0
  );
});

const avgDuration = computed(() => {
  if (totalEvents.value === 0) return 0;
  return totalDuration.value / totalEvents.value;
});

const recentEntries = computed(() => {
  return props.entries.slice(-20).reverse();
});

/**
 * Format duration in milliseconds
 */
function formatDuration(ms: number | undefined): string {
  if (ms === undefined || ms === null) return "-";
  if (ms < 1) return `${(ms * 1000).toFixed(2)}µs`;
  if (ms < 1000) return `${ms.toFixed(2)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

/**
 * Format operation name for display
 */
function formatOperationName(type: string): string {
  const names: Record<string, string> = {
    load: "Document Load",
    loadPdf: "PDF Load",
    loadDocx: "DOCX Load",
    renderPage: "Page Render",
    getLayoutPage: "Layout Query",
    getFontUsage: "Font Query",
    search: "Search",
    initUI: "UI Init",
    initWorker: "Worker Init",
  };
  return names[type] || type;
}

/**
 * Format context object for display
 */
function formatContext(context: any): string {
  if (typeof context === "object") {
    return Object.entries(context)
      .map(([key, value]) => {
        // Format numbers to 4 decimal places
        if (typeof value === "number") {
          return `${key}: ${value.toFixed(4)}`;
        }
        return `${key}: ${value}`;
      })
      .join(", ");
  }
  return String(context);
}

/**
 * Get bar width percentage for visualization
 */
function getBarWidth(duration: number): string {
  if (totalDuration.value === 0) return "0%";
  const percentage = (duration / totalDuration.value) * 100;
  return `${Math.min(percentage, 100)}%`;
}

/**
 * Handle reset button click
 */
function handleReset() {
  emit("reset");
}

/**
 * Handle export button click
 */
function handleExport() {
  emit("export");
}
</script>

<style scoped>
.performance-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--udoc-bg-surface, #fff);
  border-left: 1px solid var(--udoc-border, #e0e0e0);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  overflow: hidden;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--udoc-border, #e0e0e0);
  background: var(--udoc-bg-header, #f8f8f8);
}

.panel-header h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--udoc-text-primary, rgba(0, 0, 0, 0.8));
}

.header-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  padding: 6px 12px;
  font-size: 13px;
  font-weight: 500;
  border: 1px solid var(--udoc-border, #d0d0d0);
  border-radius: 6px;
  background: var(--udoc-bg-surface, #fff);
  color: var(--udoc-text-primary, rgba(0, 0, 0, 0.8));
  cursor: pointer;
  transition: all 0.15s;
}

.action-btn:hover {
  background: var(--udoc-hover-overlay, rgba(0, 0, 0, 0.08));
}

.action-btn.primary {
  background: var(--udoc-primary, #333);
  border-color: var(--udoc-primary, #333);
  color: #fff;
}

.action-btn.primary:hover {
  background: var(--udoc-primary-hover, #555);
}

.panel-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.summary-section {
  margin-bottom: 24px;
}

.summary-section h3 {
  margin: 0 0 12px;
  font-size: 14px;
  font-weight: 600;
  color: var(--udoc-text-secondary, rgba(0, 0, 0, 0.7));
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.summary-card {
  padding: 16px;
  background: var(--udoc-bg-subtle, #f8f8f8);
  border-radius: 8px;
  border: 1px solid var(--udoc-border, #e0e0e0);
}

.card-label {
  font-size: 12px;
  color: var(--udoc-text-muted, rgba(0, 0, 0, 0.58));
  margin-bottom: 4px;
}

.card-value {
  font-size: 20px;
  font-weight: 600;
  color: var(--udoc-text-primary, rgba(0, 0, 0, 0.8));
}

.breakdown-section {
  margin-bottom: 24px;
}

.breakdown-section h3 {
  margin: 0 0 12px;
  font-size: 14px;
  font-weight: 600;
  color: var(--udoc-text-secondary, rgba(0, 0, 0, 0.7));
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.breakdown-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.breakdown-item {
  padding: 12px;
  background: var(--udoc-bg-surface, #fff);
  border: 1px solid var(--udoc-border, #e0e0e0);
  border-radius: 8px;
}

.breakdown-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.operation-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--udoc-text-primary, rgba(0, 0, 0, 0.8));
}

.operation-count {
  font-size: 12px;
  color: var(--udoc-text-muted, rgba(0, 0, 0, 0.58));
}

.breakdown-stats {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px 16px;
  margin-bottom: 8px;
}

.stat {
  font-size: 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.stat-label {
  color: var(--udoc-text-muted, rgba(0, 0, 0, 0.58));
  margin-right: 4px;
}

.stat-value {
  color: var(--udoc-text-primary, rgba(0, 0, 0, 0.8));
  font-weight: 500;
  text-align: right;
}

.breakdown-bar {
  height: 4px;
  background: var(--udoc-bg-subtle, #f0f0f0);
  border-radius: 2px;
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  background: var(--udoc-primary, #333);
  border-radius: 2px;
  transition: width 0.3s ease;
}

.timeline-section h3 {
  margin: 0 0 12px;
  font-size: 14px;
  font-weight: 600;
  color: var(--udoc-text-secondary, rgba(0, 0, 0, 0.7));
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.timeline-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.timeline-item {
  display: flex;
  gap: 12px;
  padding: 8px 12px;
  background: var(--udoc-bg-surface, #fff);
  border: 1px solid var(--udoc-border, #e0e0e0);
  border-radius: 6px;
  border-left: 3px solid var(--udoc-text-muted, #999);
}

.timeline-item.start {
  border-left-color: var(--udoc-accent, #0066cc);
}

.timeline-item.end {
  border-left-color: var(--udoc-success, #28a745);
}

.timeline-marker {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--udoc-text-muted, #999);
  margin-top: 6px;
}

.timeline-item.start .timeline-marker {
  background: var(--udoc-accent, #0066cc);
}

.timeline-item.end .timeline-marker {
  background: var(--udoc-success, #28a745);
}

.timeline-content {
  flex: 1;
}

.timeline-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.timeline-type {
  font-size: 13px;
  font-weight: 500;
  color: var(--udoc-text-primary, rgba(0, 0, 0, 0.8));
}

.timeline-phase {
  font-size: 11px;
  text-transform: uppercase;
  padding: 2px 6px;
  border-radius: 4px;
  background: var(--udoc-bg-subtle, #f0f0f0);
  color: var(--udoc-text-muted, rgba(0, 0, 0, 0.58));
}

.timeline-details {
  display: flex;
  gap: 12px;
  align-items: center;
}

.timeline-duration {
  font-size: 12px;
  font-weight: 600;
  color: var(--udoc-success, #28a745);
}

.timeline-error {
  font-size: 12px;
  color: var(--udoc-error, #dc3545);
}

.timeline-context {
  font-size: 11px;
  color: var(--udoc-text-muted, rgba(0, 0, 0, 0.58));
  margin-top: 4px;
}

.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  text-align: center;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-state p {
  font-size: 14px;
  color: var(--udoc-text-muted, rgba(0, 0, 0, 0.58));
  margin-bottom: 8px;
}

.empty-hint {
  font-size: 12px;
  color: var(--udoc-text-faint, rgba(0, 0, 0, 0.52));
}

@media (max-width: 768px) {
  .summary-grid {
    grid-template-columns: 1fr;
  }
  
  .breakdown-stats {
    flex-wrap: wrap;
  }
}
</style>
