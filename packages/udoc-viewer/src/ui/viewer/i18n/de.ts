import type { TranslationKeys } from "./types.js";

export const de: TranslationKeys = {
    // Shell / regions
    "shell.skipToDocument": "Zum Dokument springen",
    "shell.regionToolbar": "Symbolleiste",
    "shell.regionSidePanel": "Seitenleiste",
    "shell.regionDocument": "Dokument",
    "shell.regionSearchComments": "Suche und Kommentare",
    "shell.pageOfTotal": "Seite {page} von {pageCount}",
    "shell.zoomPercent": "Zoom {percent}%",
    "shell.panelOpened": "{panel}-Bereich geöffnet",
    "shell.panelClosed": "Bereich geschlossen",
    "shell.shortcutHelp":
        "Tastenkürzel: F6 zum Navigieren zwischen Bereichen, Ctrl+F zum Suchen, Ctrl+P zum Drucken, " +
        "Ctrl+Plus zum Vergrößern, Ctrl+Minus zum Verkleinern, Ctrl+0 zum Zurücksetzen des Zooms, Escape zum Schließen von Bereichen. " +
        "Drücken Sie ? für eine Liste der Tastenkürzel.",
    "shell.shortcutHelpAnnounce":
        "Tastenkürzel: F6 Bereiche navigieren, Ctrl+F Suchen, Ctrl+P Drucken, " +
        "Ctrl+Plus Vergrößern, Ctrl+Minus Verkleinern, Ctrl+0 Zoom zurücksetzen, Escape Bereich schließen, " +
        "? diese Hilfe anzeigen.",

    // Toolbar
    "toolbar.label": "Dokumentensymbolleiste",
    "toolbar.menu": "Menü",
    "toolbar.search": "Suchen",
    "toolbar.comments": "Kommentare",
    "toolbar.print": "Drucken",
    "toolbar.download": "Herunterladen",
    "toolbar.fullscreen": "Vollbild",
    "toolbar.exitFullscreen": "Vollbild beenden",
    "toolbar.darkMode": "Dunkler Modus",
    "toolbar.systemTheme": "Systemdesign",
    "toolbar.lightMode": "Heller Modus",
    "toolbar.previousPage": "Vorherige Seite",
    "toolbar.nextPage": "Nächste Seite",
    "toolbar.pageNumber": "Seitenzahl",
    "toolbar.zoomIn": "Vergrößern",
    "toolbar.zoomOut": "Verkleinern",
    "toolbar.zoomLevel": "Zoomstufe",
    "toolbar.zoomOptions": "Zoomoptionen",
    "toolbar.zoomLevels": "Zoomstufen",
    "toolbar.more": "Mehr",

    // Zoom modes
    "zoom.fitWidth": "Breite anpassen",
    "zoom.fitHeight": "Höhe anpassen",
    "zoom.fitPage": "Seite anpassen",

    // Floating toolbar
    "floatingToolbar.label": "Seitennavigation und Zoom",

    // Search panel
    "search.placeholder": "Im Dokument suchen...",
    "search.label": "Suchtext",
    "search.matchCase": "Groß-/Kleinschreibung beachten",
    "search.previousMatch": "Vorheriger Treffer (Shift+Enter)",
    "search.nextMatch": "Nächster Treffer (Enter)",
    "search.loadingText": "Text wird geladen\u2026",
    "search.noResults": "Keine Ergebnisse",
    "search.resultStatus": "{current} von {total}",
    "search.pageHeader": "Seite {page}",
    "search.resultsLabel": "Suchergebnisse",

    // Password dialog
    "password.title": "Passwort erforderlich",
    "password.message": "Dieses Dokument ist geschützt. Bitte geben Sie das Passwort ein, um es zu öffnen.",
    "password.placeholder": "Passwort eingeben",
    "password.label": "Passwort",
    "password.showPassword": "Passwort anzeigen",
    "password.hidePassword": "Passwort verbergen",
    "password.unlock": "Entsperren",

    // Print dialog
    "print.title": "Drucken",
    "print.pagesLabel": "Seiten",
    "print.allPages": "Alle Seiten",
    "print.currentPage": "Aktuelle Seite ({page})",
    "print.pagesRange": "Seiten",
    "print.pagesTo": "bis",
    "print.custom": "Benutzerdefiniert",
    "print.customPlaceholder": "z.\u00A0B. 1,3,5-8",
    "print.qualityLabel": "Qualität",
    "print.qualityDraft": "Entwurf (150 DPI)",
    "print.qualityStandard": "Standard (300 DPI)",
    "print.qualityHigh": "Hoch (600 DPI)",
    "print.cancel": "Abbrechen",
    "print.print": "Drucken",
    "print.errorPageRange": "Bitte geben Sie Seitenzahlen zwischen 1 und {max} ein.",
    "print.errorStartEnd": "Die Startseite muss kleiner oder gleich der Endseite sein.",
    "print.errorCustomRange":
        'Ungültiger Bereich. Verwenden Sie das Format „1,3,5-8". Seiten müssen zwischen 1 und {max} liegen.',

    // Loading overlay
    "loading.connecting": "Verbinden...",
    "loading.loading": "Laden...",
    "loading.processing": "Dokument wird verarbeitet...",
    "loading.preparingPrint": "Druckvorgang wird vorbereitet...",
    "loading.renderingPage": "Seite {current} von {total} wird gerendert...",
    "loading.progressSize": "{loaded} / {total} MB ({percent}%)",
    "loading.progressLoaded": "{loaded} MB geladen...",

    // View mode menu
    "viewMode.label": "Anzeigeeinstellungen",
    "viewMode.scroll": "Scrollen",
    "viewMode.layout": "Layout",
    "viewMode.rotation": "Drehung",
    "viewMode.spacing": "Abstand",
    "viewMode.spread": "Doppelseite",
    "viewMode.continuous": "Fortlaufend",
    "viewMode.single": "Einzeln",
    "viewMode.double": "Doppelt",
    "viewMode.coverRight": "Deckblatt rechts",
    "viewMode.coverLeft": "Deckblatt links",
    "viewMode.spacingAll": "Alle",
    "viewMode.spacingNone": "Keine",
    "viewMode.spacingSpread": "Doppelseite",
    "viewMode.spacingPage": "Seite",

    // Annotation panel
    "annotations.comments": "Kommentare",
    "annotations.noComments": "Keine Kommentare in diesem Dokument",
    "annotations.loading": "Kommentare werden geladen...",
    "annotations.replyCount": "{count} Antworten",
    "annotations.replyCountSingle": "1 Antwort",
    "annotations.showReplies": "Antworten anzeigen",
    "annotations.hideReplies": "Antworten ausblenden",
    "annotations.pageHeader": "Seite {page}",

    // Outline panel
    "outline.label": "Dokumentgliederung",
    "outline.loading": "Gliederung wird geladen...",
    "outline.empty": "Keine Gliederung in diesem Dokument",

    // Bookmarks panel
    "bookmarks.empty": "Keine Lesezeichen in diesem Dokument",

    // Layers panel
    "layers.loading": "Ebenen werden geladen...",
    "layers.empty": "Keine Ebenen in diesem Dokument",

    // Attachments panel
    "attachments.empty": "Keine Anhänge in diesem Dokument",
    "layers.visibility": "Sichtbarkeit der Ebene {name}",

    // Fonts panel
    "fonts.loading": "Schriftarten werden geladen...",
    "fonts.empty": "Keine Schriftartdaten verfügbar",

    // Thumbnail panel
    "thumbnails.label": "Seitenminiaturen",
    "thumbnails.pageLabel": "Seite {page}",

    // Spread and viewport
    "spread.pageLabel": "Seite {page}",
    "spread.pageContent": "Inhalt der Seite {page}",
    "spread.rendering": "Wird gerendert...",
    "viewport.documentContent": "Dokumentinhalt",

    // Left panel tabs
    "leftPanel.tabs": "Bereichsregisterkarten",
    "leftPanel.thumbnails": "Miniaturen",
    "leftPanel.outline": "Gliederung",
    "leftPanel.bookmarks": "Lesezeichen",
    "leftPanel.layers": "Ebenen",
    "leftPanel.attachments": "Anhänge",
    "leftPanel.fonts": "Schriftarten",
    "leftPanel.resizeHandle": "Seitenleiste anpassen",

    // Right panel
    "rightPanel.searchPanel": "Suchbereich",
    "rightPanel.commentsPanel": "Kommentarbereich",
    "rightPanel.resizeHandle": "Bereichsgröße anpassen",
};
