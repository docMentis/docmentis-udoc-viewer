import type { TranslationKeys } from "./types.js";

export const en: TranslationKeys = {
    // Shell / regions
    "shell.skipToDocument": "Skip to document",
    "shell.regionToolbar": "Toolbar",
    "shell.regionSidePanel": "Side panel",
    "shell.regionDocument": "Document",
    "shell.regionSearchComments": "Search and comments",
    "shell.pageOfTotal": "Page {page} of {pageCount}",
    "shell.zoomPercent": "Zoom {percent}%",
    "shell.panelOpened": "{panel} panel opened",
    "shell.panelClosed": "Panel closed",
    "shell.shortcutHelp":
        "Keyboard shortcuts: F6 to navigate regions, Ctrl+F to search, Ctrl+P to print, " +
        "Ctrl+Plus to zoom in, Ctrl+Minus to zoom out, Ctrl+0 to reset zoom, Escape to close panels. " +
        "Press ? for a list of shortcuts.",
    "shell.shortcutHelpAnnounce":
        "Keyboard shortcuts: F6 navigate regions, Ctrl+F search, Ctrl+P print, " +
        "Ctrl+Plus zoom in, Ctrl+Minus zoom out, Ctrl+0 reset zoom, Escape close panel, " +
        "? show this help.",

    // Toolbar
    "toolbar.label": "Document toolbar",
    "toolbar.menu": "Menu",
    "toolbar.search": "Search",
    "toolbar.comments": "Comments",
    "toolbar.print": "Print",
    "toolbar.download": "Download",
    "toolbar.fullscreen": "Fullscreen",
    "toolbar.exitFullscreen": "Exit fullscreen",
    "toolbar.darkMode": "Dark mode",
    "toolbar.systemTheme": "System theme",
    "toolbar.lightMode": "Light mode",
    "toolbar.previousPage": "Previous page",
    "toolbar.nextPage": "Next page",
    "toolbar.pageNumber": "Page number",
    "toolbar.zoomIn": "Zoom in",
    "toolbar.zoomOut": "Zoom out",
    "toolbar.zoomLevel": "Zoom level",
    "toolbar.zoomOptions": "Zoom options",
    "toolbar.zoomLevels": "Zoom levels",

    // Zoom modes
    "zoom.fitWidth": "Fit Width",
    "zoom.fitHeight": "Fit Height",
    "zoom.fitPage": "Fit Page",

    // Floating toolbar
    "floatingToolbar.label": "Page navigation and zoom",

    // Search panel
    "search.placeholder": "Search in document...",
    "search.label": "Search text",
    "search.matchCase": "Match case",
    "search.previousMatch": "Previous match (Shift+Enter)",
    "search.nextMatch": "Next match (Enter)",
    "search.loadingText": "Loading text\u2026",
    "search.noResults": "No results",
    "search.resultStatus": "{current} of {total}",
    "search.pageHeader": "Page {page}",
    "search.resultsLabel": "Search results",

    // Password dialog
    "password.title": "Password Required",
    "password.message": "This document is protected. Please enter the password to open it.",
    "password.placeholder": "Enter password",
    "password.label": "Password",
    "password.showPassword": "Show password",
    "password.hidePassword": "Hide password",
    "password.unlock": "Unlock",

    // Print dialog
    "print.title": "Print",
    "print.pagesLabel": "Pages",
    "print.allPages": "All pages",
    "print.currentPage": "Current page ({page})",
    "print.pagesRange": "Pages",
    "print.pagesTo": "to",
    "print.custom": "Custom",
    "print.customPlaceholder": "e.g. 1,3,5-8",
    "print.qualityLabel": "Quality",
    "print.qualityDraft": "Draft (150 DPI)",
    "print.qualityStandard": "Standard (300 DPI)",
    "print.qualityHigh": "High (600 DPI)",
    "print.cancel": "Cancel",
    "print.print": "Print",
    "print.errorPageRange": "Please enter page numbers between 1 and {max}.",
    "print.errorStartEnd": "Start page must be less than or equal to end page.",
    "print.errorCustomRange": 'Invalid range. Use format like "1,3,5-8". Pages must be between 1 and {max}.',

    // Loading overlay
    "loading.connecting": "Connecting...",
    "loading.loading": "Loading...",
    "loading.processing": "Processing document...",
    "loading.preparingPrint": "Preparing to print...",
    "loading.renderingPage": "Rendering page {current} of {total}...",
    "loading.progressSize": "{loaded} / {total} MB ({percent}%)",
    "loading.progressLoaded": "{loaded} MB loaded...",

    // View mode menu
    "viewMode.label": "View settings",
    "viewMode.scroll": "Scroll",
    "viewMode.layout": "Layout",
    "viewMode.rotation": "Rotation",
    "viewMode.spacing": "Spacing",
    "viewMode.spread": "Spread",
    "viewMode.continuous": "Continuous",
    "viewMode.single": "Single",
    "viewMode.double": "Double",
    "viewMode.coverRight": "Cover Right",
    "viewMode.coverLeft": "Cover Left",
    "viewMode.spacingAll": "All",
    "viewMode.spacingNone": "None",
    "viewMode.spacingSpread": "Spread",
    "viewMode.spacingPage": "Page",

    // Annotation panel
    "annotations.comments": "Comments",
    "annotations.noComments": "No comments in this document",
    "annotations.loading": "Loading comments...",
    "annotations.replyCount": "{count} replies",
    "annotations.replyCountSingle": "1 reply",
    "annotations.showReplies": "Show replies",
    "annotations.hideReplies": "Hide replies",
    "annotations.pageHeader": "Page {page}",

    // Outline panel
    "outline.label": "Document outline",
    "outline.loading": "Loading outline...",
    "outline.empty": "No outline in this document",

    // Bookmarks panel
    "bookmarks.empty": "No bookmarks in this document",

    // Layers panel
    "layers.loading": "Loading layers...",
    "layers.empty": "No layers in this document",

    // Attachments panel
    "attachments.empty": "No attachments in this document",
    "layers.visibility": "{name} layer visibility",

    // Thumbnail panel
    "thumbnails.label": "Page thumbnails",
    "thumbnails.pageLabel": "Page {page}",

    // Spread / page rendering
    "spread.pageLabel": "Page {page}",
    "spread.pageContent": "Page {page} content",
    "spread.rendering": "Rendering...",

    // Viewport
    "viewport.documentContent": "Document content",

    // Left panel tabs
    "leftPanel.tabs": "Panel tabs",
    "leftPanel.thumbnails": "Thumbnails",
    "leftPanel.outline": "Outline",
    "leftPanel.bookmarks": "Bookmarks",
    "leftPanel.layers": "Layers",
    "leftPanel.attachments": "Attachments",
    "leftPanel.resizeHandle": "Resize side panel",

    // Right panel
    "rightPanel.searchPanel": "Search panel",
    "rightPanel.commentsPanel": "Comments panel",
    "rightPanel.resizeHandle": "Resize panel",
};
