/**
 * Translation key interface for all user-facing strings in the viewer.
 *
 * Keys use dot-separated namespaces (e.g. "toolbar.search").
 * Parameterized strings use `{param}` placeholders.
 */
export interface TranslationKeys {
    // Shell / regions
    "shell.skipToDocument": string;
    "shell.regionToolbar": string;
    "shell.regionSidePanel": string;
    "shell.regionDocument": string;
    "shell.regionSearchComments": string;
    "shell.pageOfTotal": string; // "Page {page} of {pageCount}"
    "shell.zoomPercent": string; // "Zoom {percent}%"
    "shell.panelOpened": string; // "{panel} panel opened"
    "shell.panelClosed": string;
    "shell.shortcutHelp": string;
    "shell.shortcutHelpAnnounce": string;

    // Toolbar
    "toolbar.label": string;
    "toolbar.menu": string;
    "toolbar.search": string;
    "toolbar.comments": string;
    "toolbar.print": string;
    "toolbar.download": string;
    "toolbar.fullscreen": string;
    "toolbar.exitFullscreen": string;
    "toolbar.darkMode": string;
    "toolbar.systemTheme": string;
    "toolbar.lightMode": string;
    "toolbar.previousPage": string;
    "toolbar.nextPage": string;
    "toolbar.pageNumber": string;
    "toolbar.zoomIn": string;
    "toolbar.zoomOut": string;
    "toolbar.zoomLevel": string;
    "toolbar.zoomOptions": string;
    "toolbar.zoomLevels": string;
    "toolbar.more": string;

    // Zoom modes (shared between Toolbar and FloatingToolbar)
    "zoom.fitWidth": string;
    "zoom.fitHeight": string;
    "zoom.fitPage": string;

    // Floating toolbar
    "floatingToolbar.label": string;

    // Search panel
    "search.placeholder": string;
    "search.label": string;
    "search.matchCase": string;
    "search.previousMatch": string;
    "search.nextMatch": string;
    "search.loadingText": string;
    "search.noResults": string;
    "search.resultStatus": string; // "{current} of {total}"
    "search.pageHeader": string; // "Page {page}"
    "search.resultsLabel": string;

    // Password dialog
    "password.title": string;
    "password.message": string;
    "password.placeholder": string;
    "password.label": string;
    "password.showPassword": string;
    "password.hidePassword": string;
    "password.unlock": string;

    // Print dialog
    "print.title": string;
    "print.pagesLabel": string;
    "print.allPages": string;
    "print.currentPage": string; // "Current page ({page})"
    "print.pagesRange": string;
    "print.pagesTo": string;
    "print.custom": string;
    "print.customPlaceholder": string;
    "print.qualityLabel": string;
    "print.qualityDraft": string;
    "print.qualityStandard": string;
    "print.qualityHigh": string;
    "print.cancel": string;
    "print.print": string;
    "print.errorPageRange": string; // "Please enter page numbers between 1 and {max}."
    "print.errorStartEnd": string;
    "print.errorCustomRange": string; // 'Invalid range. Use format like "1,3,5-8". Pages must be between 1 and {max}.'

    // Loading overlay
    "loading.connecting": string;
    "loading.loading": string;
    "loading.processing": string;
    "loading.preparingPrint": string;
    "loading.renderingPage": string; // "Rendering page {current} of {total}..."
    "loading.progressSize": string; // "{loaded} / {total} MB ({percent}%)"
    "loading.progressLoaded": string; // "{loaded} MB loaded..."

    // View mode menu
    "viewMode.label": string;
    "viewMode.scroll": string;
    "viewMode.layout": string;
    "viewMode.rotation": string;
    "viewMode.spacing": string;
    "viewMode.spread": string;
    "viewMode.continuous": string;
    "viewMode.single": string;
    "viewMode.double": string;
    "viewMode.coverRight": string;
    "viewMode.coverLeft": string;
    "viewMode.spacingAll": string;
    "viewMode.spacingNone": string;
    "viewMode.spacingSpread": string;
    "viewMode.spacingPage": string;

    // Annotation panel
    "annotations.comments": string;
    "annotations.noComments": string;
    "annotations.loading": string;
    "annotations.replyCount": string; // "{count} replies"
    "annotations.replyCountSingle": string; // "1 reply"
    "annotations.showReplies": string;
    "annotations.hideReplies": string;
    "annotations.pageHeader": string; // "Page {page}"

    // Outline panel
    "outline.label": string;
    "outline.loading": string;
    "outline.empty": string;

    // Bookmarks panel
    "bookmarks.empty": string;

    // Layers panel
    "layers.loading": string;
    "layers.empty": string;

    // Attachments panel
    "attachments.empty": string;
    "layers.visibility": string; // "{name} layer visibility"

    // Thumbnail panel
    "thumbnails.label": string;
    "thumbnails.pageLabel": string; // "Page {page}"

    // Spread / page rendering
    "spread.pageLabel": string; // "Page {page}"
    "spread.pageContent": string; // "Page {page} content"
    "spread.rendering": string;

    // Viewport
    "viewport.documentContent": string;

    // Left panel tabs
    "leftPanel.tabs": string;
    "leftPanel.thumbnails": string;
    "leftPanel.outline": string;
    "leftPanel.bookmarks": string;
    "leftPanel.layers": string;
    "leftPanel.attachments": string;
    "leftPanel.resizeHandle": string;

    // Right panel
    "rightPanel.searchPanel": string;
    "rightPanel.commentsPanel": string;
    "rightPanel.resizeHandle": string;
}
