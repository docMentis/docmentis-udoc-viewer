import type { TranslationKeys } from "./types.js";

export const fr: TranslationKeys = {
    // Shell / regions
    "shell.skipToDocument": "Aller au document",
    "shell.regionToolbar": "Barre d'outils",
    "shell.regionSidePanel": "Panneau latéral",
    "shell.regionDocument": "Document",
    "shell.regionSearchComments": "Recherche et commentaires",
    "shell.pageOfTotal": "Page {page} sur {pageCount}",
    "shell.zoomPercent": "Zoom {percent} %",
    "shell.panelOpened": "Panneau {panel} ouvert",
    "shell.panelClosed": "Panneau fermé",
    "shell.shortcutHelp":
        "Raccourcis clavier : F6 pour naviguer entre les zones, Ctrl+F pour rechercher, Ctrl+P pour imprimer, " +
        "Ctrl+Plus pour zoomer, Ctrl+Minus pour dézoomer, Ctrl+0 pour réinitialiser le zoom, Échap pour fermer les panneaux. " +
        "Appuyez sur ? pour afficher la liste des raccourcis.",
    "shell.shortcutHelpAnnounce":
        "Raccourcis clavier : F6 naviguer entre les zones, Ctrl+F rechercher, Ctrl+P imprimer, " +
        "Ctrl+Plus zoomer, Ctrl+Minus dézoomer, Ctrl+0 réinitialiser le zoom, Échap fermer le panneau, " +
        "? afficher cette aide.",

    // Toolbar
    "toolbar.label": "Barre d'outils du document",
    "toolbar.menu": "Menu",
    "toolbar.search": "Rechercher",
    "toolbar.comments": "Commentaires",
    "toolbar.print": "Imprimer",
    "toolbar.download": "Télécharger",
    "toolbar.fullscreen": "Plein écran",
    "toolbar.exitFullscreen": "Quitter le plein écran",
    "toolbar.darkMode": "Mode sombre",
    "toolbar.systemTheme": "Thème du système",
    "toolbar.lightMode": "Mode clair",
    "toolbar.previousPage": "Page précédente",
    "toolbar.nextPage": "Page suivante",
    "toolbar.pageNumber": "Numéro de page",
    "toolbar.zoomIn": "Zoomer",
    "toolbar.zoomOut": "Dézoomer",
    "toolbar.zoomLevel": "Niveau de zoom",
    "toolbar.zoomOptions": "Options de zoom",
    "toolbar.zoomLevels": "Niveaux de zoom",
    "toolbar.more": "Plus",

    // Zoom modes
    "zoom.fitWidth": "Ajuster à la largeur",
    "zoom.fitHeight": "Ajuster à la hauteur",
    "zoom.fitPage": "Ajuster à la page",

    // Floating toolbar
    "floatingToolbar.label": "Navigation et zoom",

    // Search panel
    "search.placeholder": "Rechercher dans le document...",
    "search.label": "Texte de recherche",
    "search.matchCase": "Respecter la casse",
    "search.fuzzyMatch": "Correspondance floue",
    "search.previousMatch": "Résultat précédent (Shift+Enter)",
    "search.nextMatch": "Résultat suivant (Enter)",
    "search.loadingText": "Chargement du texte…",
    "search.noResults": "Aucun résultat",
    "search.resultStatus": "{current} sur {total}",
    "search.pageHeader": "Page {page}",
    "search.resultsLabel": "Résultats de recherche",

    // Password dialog
    "password.title": "Mot de passe requis",
    "password.message": "Ce document est protégé. Veuillez saisir le mot de passe pour l'ouvrir.",
    "password.placeholder": "Saisir le mot de passe",
    "password.label": "Mot de passe",
    "password.showPassword": "Afficher le mot de passe",
    "password.hidePassword": "Masquer le mot de passe",
    "password.unlock": "Déverrouiller",

    // Print dialog
    "print.title": "Imprimer",
    "print.pagesLabel": "Pages",
    "print.allPages": "Toutes les pages",
    "print.currentPage": "Page actuelle ({page})",
    "print.pagesRange": "Pages",
    "print.pagesTo": "à",
    "print.custom": "Personnalisé",
    "print.customPlaceholder": "ex. 1,3,5-8",
    "print.qualityLabel": "Qualité",
    "print.qualityDraft": "Brouillon (150 DPI)",
    "print.qualityStandard": "Standard (300 DPI)",
    "print.qualityHigh": "Haute (600 DPI)",
    "print.cancel": "Annuler",
    "print.print": "Imprimer",
    "print.errorPageRange": "Veuillez saisir des numéros de page entre 1 et {max}.",
    "print.errorStartEnd": "La page de début doit être inférieure ou égale à la page de fin.",
    "print.errorCustomRange":
        "Plage non valide. Utilisez le format « 1,3,5-8 ». Les pages doivent être entre 1 et {max}.",

    // Loading overlay
    "loading.connecting": "Connexion...",
    "loading.loading": "Chargement...",
    "loading.processing": "Traitement du document...",
    "loading.preparingPrint": "Préparation de l'impression...",
    "loading.renderingPage": "Rendu de la page {current} sur {total}...",
    "loading.progressSize": "{loaded} / {total} Mo ({percent} %)",
    "loading.progressLoaded": "{loaded} Mo chargés...",

    // View mode menu
    "viewMode.label": "Paramètres d'affichage",
    "viewMode.view": "Vue",
    "viewMode.paged": "Paginé",
    "viewMode.continuousView": "Continu",
    "viewMode.scroll": "Défilement",
    "viewMode.layout": "Disposition",
    "viewMode.rotation": "Rotation",
    "viewMode.spacing": "Espacement",
    "viewMode.spread": "Double page",
    "viewMode.continuous": "Continu",
    "viewMode.single": "Simple",
    "viewMode.double": "Double",
    "viewMode.coverRight": "Couverture à droite",
    "viewMode.coverLeft": "Couverture à gauche",
    "viewMode.spacingAll": "Tout",
    "viewMode.spacingNone": "Aucun",
    "viewMode.spacingSpread": "Double page",
    "viewMode.spacingPage": "Page",

    // Annotation panel
    "annotations.comments": "Commentaires",
    "annotations.noComments": "Aucun commentaire dans ce document",
    "annotations.loading": "Chargement des commentaires...",
    "annotations.replyCount": "{count} réponses",
    "annotations.replyCountSingle": "1 réponse",
    "annotations.showReplies": "Afficher les réponses",
    "annotations.hideReplies": "Masquer les réponses",
    "annotations.pageHeader": "Page {page}",

    // Outline panel
    "outline.label": "Sommaire du document",
    "outline.loading": "Chargement du sommaire...",
    "outline.empty": "Aucun sommaire dans ce document",

    // Bookmarks panel
    "bookmarks.empty": "Aucun signet dans ce document",

    // Layers panel
    "layers.loading": "Chargement des calques...",
    "layers.empty": "Aucun calque dans ce document",

    // Attachments panel
    "attachments.empty": "Aucune pièce jointe dans ce document",
    "layers.visibility": "Visibilité du calque {name}",

    // Fonts panel
    "fonts.loading": "Chargement des polices...",
    "fonts.empty": "Aucune donnée de police disponible",

    // Thumbnail panel
    "thumbnails.label": "Miniatures des pages",
    "thumbnails.pageLabel": "Page {page}",

    // Spread and viewport
    "spread.pageLabel": "Page {page}",
    "spread.pageContent": "Contenu de la page {page}",
    "spread.rendering": "Rendu en cours...",
    "viewport.documentContent": "Contenu du document",

    // Left panel tabs
    "leftPanel.tabs": "Onglets du panneau",
    "leftPanel.thumbnails": "Miniatures",
    "leftPanel.outline": "Sommaire",
    "leftPanel.bookmarks": "Signets",
    "leftPanel.layers": "Calques",
    "leftPanel.attachments": "Pièces jointes",
    "leftPanel.fonts": "Polices",
    "leftPanel.resizeHandle": "Redimensionner le panneau latéral",

    // Right panel
    "rightPanel.searchPanel": "Panneau de recherche",
    "rightPanel.commentsPanel": "Panneau de commentaires",
    "rightPanel.resizeHandle": "Redimensionner le panneau",
    // Tools
    "tools.pointer": "Pointeur",
    "tools.hand": "Main",
    "tools.zoom": "Zoom",
    "tools.annotate": "Annoter",
    "tools.markup": "Marquage",
    "tools.subtoolbar": "Options d'outil",
    // Shared sub-tools
    "tools.select": "Sélectionner",
    "tools.deleteAnnotation": "Supprimer l'annotation",
    // Annotate sub-tools
    "tools.freehand": "Main levée",
    "tools.line": "Ligne",
    "tools.arrow": "Flèche",
    "tools.rectangle": "Rectangle",
    "tools.ellipse": "Ellipse",
    "tools.polygon": "Polygone",
    "tools.polyline": "Polyligne",
    "tools.textbox": "Zone de texte",
    // Markup sub-tools
    "tools.highlight": "Surligner",
    "tools.underline": "Souligner",
    "tools.strikethrough": "Barrer",
    "tools.squiggly": "Ondulé",
    // Tool options
    "tools.strokeColor": "Couleur du trait",
    "tools.fillColor": "Couleur de remplissage",
    "tools.noFill": "Sans remplissage",
    "tools.strokeWidth": "Épaisseur du trait",
    "tools.opacity": "Opacité",
    "tools.fontSize": "Taille de police",
    "tools.lineStyle": "Style de ligne",
    "tools.lineStyleSolid": "Continu",
    "tools.lineStyleDashed": "Tirets",
    "tools.lineStyleDotted": "Pointillé",
    "tools.arrowHeadStart": "Début",
    "tools.arrowHeadEnd": "Fin",
    "tools.arrowHeadNone": "Aucune",
    "tools.arrowHeadOpen": "Ouverte",
    "tools.arrowHeadClosed": "Fermée",
    "tools.undo": "Annuler",
    "tools.redo": "Rétablir",
};
