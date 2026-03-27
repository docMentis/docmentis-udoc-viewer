// Main classes
export { UDocClient } from "./UDocClient.js";
export type {
    ClientOptions,
    ViewerOptions,
    DocumentSource,
    LicenseInfo,
    Pick,
    Composition,
    ComposePick,
    FontEntry,
    FontInfo,
} from "./UDocClient.js";

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
    UIComponent,
} from "./UDocViewer.js";

// Print dialog types
export type { PrintDialogResult, PrintPageRange, PrintQuality } from "./ui/viewer/components/PrintDialog.js";

// i18n types
export type { TranslationKeys } from "./ui/viewer/i18n/index.js";
export type { I18n } from "./ui/viewer/i18n/index.js";
export { createI18n } from "./ui/viewer/i18n/index.js";

// View mode and panel types
export type {
    ScrollMode,
    LayoutMode,
    ZoomMode,
    PageRotation,
    SpacingMode,
    PanelTab,
    LeftPanelTab,
    RightPanelTab,
    ThemeMode,
} from "./ui/viewer/state.js";

// Worker internals (types only, for advanced usage)
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
