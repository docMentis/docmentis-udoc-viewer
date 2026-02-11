// Main classes
export { UDocClient } from "./UDocClient.js";
export type { ClientOptions, ViewerOptions, DocumentSource, LicenseInfo, Pick, Composition, ComposePick } from "./UDocClient.js";

export { UDocViewer } from "./UDocViewer.js";
export type {
  RenderOptions,
  RenderedPage,
  DocumentMetadata,
  OutlineItem,
  Destination,
  DestinationDisplay,
  Annotation,
  ViewerEventMap,
  DownloadProgress,
} from "./UDocViewer.js";

// Worker internals (for advanced usage)
export { WorkerClient } from "./worker/index.js";
export type { PageInfo, LicenseResult, WorkerRequest, WorkerResponse } from "./worker/index.js";

// Performance tracking
export type {
  IPerformanceCounter,
  PerformanceEventType,
  PerformanceEventContext,
  PerformanceLogEntry,
  PerformanceLogCallback,
  PerformanceEventStats,
  PerformanceCounterSummary,
} from "./performance/index.js";

// Google Fonts support
export { enableGoogleFonts } from "./fonts.js";
