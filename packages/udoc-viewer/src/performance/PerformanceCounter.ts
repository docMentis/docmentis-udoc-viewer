/**
 * Performance counter for tracking viewer operations.
 *
 * Logs both START and END events to show the sequence and overlap of operations.
 */

/**
 * Types of operations that can be tracked.
 */
export type PerformanceEventType =
  | "download" // Fetching document (URL/File resolution)
  | "loadPdf" // WASM loadPdf operation
  | "loadImage" // WASM loadImage operation
  | "loadPptx" // WASM loadPptx operation
  | "getPageCount" // Get document page count
  | "getPageInfo" // Get single page info
  | "getAllPageInfo" // Get all page info batch
  | "getOutline" // Get document outline
  | "getAllAnnotations" // Get all annotations
  | "getPageAnnotations" // Get single page annotations
  | "getPageText" // Get single page text (for text selection)
  | "renderPage" // Render a page
  | "renderThumbnail" // Render a thumbnail
  | "initUiShell"; // UI shell initialization

/**
 * Context for page-specific operations.
 */
export interface PerformanceEventContext {
  pageIndex?: number;
  scale?: number;
}

/**
 * A log entry for a performance event.
 */
export interface PerformanceLogEntry {
  /** Whether this is a start or end event */
  phase: "start" | "end";
  /** The type of operation */
  type: PerformanceEventType;
  /** Timestamp relative to load() start (ms) */
  timestamp: number;
  /** Optional context (e.g., page index) */
  context?: PerformanceEventContext;
  /** Duration in ms (only for "end" phase) */
  duration?: number;
  /** Whether the operation succeeded (only for "end" phase) */
  success?: boolean;
  /** Error message if failed (only for "end" phase) */
  error?: string;
}

/**
 * Callback for performance log entries.
 */
export type PerformanceLogCallback = (entry: PerformanceLogEntry) => void;

/**
 * Summary statistics for a single event type.
 */
export interface PerformanceEventStats {
  count: number;
  totalDuration: number;
  avgDuration: number;
  minDuration: number;
  maxDuration: number;
}

/**
 * Summary of all performance data.
 */
export interface PerformanceCounterSummary {
  /** Breakdown by operation type */
  breakdown: Partial<Record<PerformanceEventType, PerformanceEventStats>>;
}

/**
 * Interface for performance counter (enables no-op implementation).
 */
export interface IPerformanceCounter {
  /** Whether performance tracking is enabled */
  readonly enabled: boolean;

  /** All logged entries in order */
  readonly entries: readonly PerformanceLogEntry[];

  /**
   * Set the load start time. Should be called at the beginning of load().
   * All timestamps will be relative to this time.
   */
  setLoadStartTime(): void;

  /**
   * Mark the start of an operation.
   * @returns Event ID to use with markEnd()
   */
  markStart(
    type: PerformanceEventType,
    context?: PerformanceEventContext,
  ): string;

  /**
   * Mark the end of an operation.
   * @param eventId - The ID returned from markStart()
   * @param success - Whether the operation succeeded (default: true)
   * @param error - Error message if failed
   */
  markEnd(eventId: string, success?: boolean, error?: string): void;

  /**
   * Subscribe to log entries.
   * @returns Unsubscribe function
   */
  onLog(callback: PerformanceLogCallback): () => void;

  /**
   * Get summary statistics.
   */
  getSummary(): PerformanceCounterSummary;

  /**
   * Reset all recorded entries and start time.
   */
  reset(): void;
}

/**
 * Internal tracking for pending events.
 */
interface PendingEvent {
  type: PerformanceEventType;
  context?: PerformanceEventContext;
  startTime: number;
}

/**
 * Performance counter implementation.
 */
export class PerformanceCounter implements IPerformanceCounter {
  readonly enabled = true;

  private _entries: PerformanceLogEntry[] = [];
  private _pendingEvents = new Map<string, PendingEvent>();
  private _listeners = new Set<PerformanceLogCallback>();
  private _eventIdCounter = 0;
  private _loadStartTime: number | null = null;

  get entries(): readonly PerformanceLogEntry[] {
    return this._entries;
  }

  /**
   * Set the load start time. Called at the beginning of load().
   */
  setLoadStartTime(): void {
    this._loadStartTime = performance.now();
  }

  markStart(
    type: PerformanceEventType,
    context?: PerformanceEventContext,
  ): string {
    const eventId = `${type}_${++this._eventIdCounter}`;
    const now = performance.now();

    this._pendingEvents.set(eventId, {
      type,
      context,
      startTime: now,
    });

    const entry: PerformanceLogEntry = {
      phase: "start",
      type,
      timestamp: this._loadStartTime !== null ? now - this._loadStartTime : 0,
      context,
    };

    this._entries.push(entry);
    this._notifyListeners(entry);

    return eventId;
  }

  markEnd(eventId: string, success = true, error?: string): void {
    const pending = this._pendingEvents.get(eventId);
    if (!pending) return;

    this._pendingEvents.delete(eventId);
    const now = performance.now();
    const duration = now - pending.startTime;

    const entry: PerformanceLogEntry = {
      phase: "end",
      type: pending.type,
      timestamp: this._loadStartTime !== null ? now - this._loadStartTime : 0,
      context: pending.context,
      duration,
      success,
      error,
    };

    this._entries.push(entry);
    this._notifyListeners(entry);
  }

  onLog(callback: PerformanceLogCallback): () => void {
    this._listeners.add(callback);
    return () => this._listeners.delete(callback);
  }

  getSummary(): PerformanceCounterSummary {
    const breakdown: Partial<Record<PerformanceEventType, PerformanceEventStats>> = {};

    // Collect durations by type from end events
    const durationsByType = new Map<PerformanceEventType, number[]>();

    for (const entry of this._entries) {
      if (entry.phase === "end" && entry.duration !== undefined) {
        const durations = durationsByType.get(entry.type) ?? [];
        durations.push(entry.duration);
        durationsByType.set(entry.type, durations);
      }
    }

    // Calculate stats for each type
    for (const [type, durations] of durationsByType) {
      if (durations.length > 0) {
        const total = durations.reduce((a, b) => a + b, 0);
        breakdown[type] = {
          count: durations.length,
          totalDuration: total,
          avgDuration: total / durations.length,
          minDuration: Math.min(...durations),
          maxDuration: Math.max(...durations),
        };
      }
    }

    return { breakdown };
  }

  reset(): void {
    this._entries = [];
    this._pendingEvents.clear();
    this._eventIdCounter = 0;
    this._loadStartTime = null;
  }

  private _notifyListeners(entry: PerformanceLogEntry): void {
    for (const listener of this._listeners) {
      try {
        listener(entry);
      } catch {
        // Ignore listener errors
      }
    }
  }
}

/**
 * No-op implementation for when performance tracking is disabled.
 * All methods are no-ops with minimal overhead.
 */
export class NoOpPerformanceCounter implements IPerformanceCounter {
  readonly enabled = false;
  readonly entries: readonly PerformanceLogEntry[] = [];

  setLoadStartTime(): void {}

  markStart(): string {
    return "";
  }

  markEnd(): void {}

  onLog(): () => void {
    return () => {};
  }

  getSummary(): PerformanceCounterSummary {
    return { breakdown: {} };
  }

  reset(): void {}
}
