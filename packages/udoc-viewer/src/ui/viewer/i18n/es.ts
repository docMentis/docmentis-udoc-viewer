import type { TranslationKeys } from "./types.js";

export const es: TranslationKeys = {
    // Shell / regions
    "shell.skipToDocument": "Ir al documento",
    "shell.regionToolbar": "Barra de herramientas",
    "shell.regionSidePanel": "Panel lateral",
    "shell.regionDocument": "Documento",
    "shell.regionSearchComments": "Búsqueda y comentarios",
    "shell.pageOfTotal": "Página {page} de {pageCount}",
    "shell.zoomPercent": "Zoom {percent}%",
    "shell.panelOpened": "Panel {panel} abierto",
    "shell.panelClosed": "Panel cerrado",
    "shell.shortcutHelp":
        "Atajos de teclado: F6 para navegar entre regiones, Ctrl+F para buscar, Ctrl+P para imprimir, " +
        "Ctrl+Plus para ampliar, Ctrl+Minus para reducir, Ctrl+0 para restablecer el zoom, Escape para cerrar paneles. " +
        "Pulse ? para ver la lista de atajos.",
    "shell.shortcutHelpAnnounce":
        "Atajos de teclado: F6 navegar entre regiones, Ctrl+F buscar, Ctrl+P imprimir, " +
        "Ctrl+Plus ampliar, Ctrl+Minus reducir, Ctrl+0 restablecer zoom, Escape cerrar panel, " +
        "? mostrar esta ayuda.",

    // Toolbar
    "toolbar.label": "Barra de herramientas del documento",
    "toolbar.menu": "Menú",
    "toolbar.search": "Buscar",
    "toolbar.comments": "Comentarios",
    "toolbar.print": "Imprimir",
    "toolbar.download": "Descargar",
    "toolbar.fullscreen": "Pantalla completa",
    "toolbar.exitFullscreen": "Salir de pantalla completa",
    "toolbar.darkMode": "Modo oscuro",
    "toolbar.systemTheme": "Tema del sistema",
    "toolbar.lightMode": "Modo claro",
    "toolbar.previousPage": "Página anterior",
    "toolbar.nextPage": "Página siguiente",
    "toolbar.pageNumber": "Número de página",
    "toolbar.zoomIn": "Ampliar",
    "toolbar.zoomOut": "Reducir",
    "toolbar.zoomLevel": "Nivel de zoom",
    "toolbar.zoomOptions": "Opciones de zoom",
    "toolbar.zoomLevels": "Niveles de zoom",

    // Zoom modes
    "zoom.fitWidth": "Ajustar al ancho",
    "zoom.fitHeight": "Ajustar al alto",
    "zoom.fitPage": "Ajustar a la página",

    // Floating toolbar
    "floatingToolbar.label": "Navegación de páginas y zoom",

    // Search panel
    "search.placeholder": "Buscar en el documento...",
    "search.label": "Texto de búsqueda",
    "search.matchCase": "Distinguir mayúsculas",
    "search.previousMatch": "Coincidencia anterior (Shift+Enter)",
    "search.nextMatch": "Siguiente coincidencia (Enter)",
    "search.loadingText": "Cargando texto…",
    "search.noResults": "Sin resultados",
    "search.resultStatus": "{current} de {total}",
    "search.pageHeader": "Página {page}",
    "search.resultsLabel": "Resultados de búsqueda",

    // Password dialog
    "password.title": "Contraseña requerida",
    "password.message": "Este documento está protegido. Introduzca la contraseña para abrirlo.",
    "password.placeholder": "Introducir contraseña",
    "password.label": "Contraseña",
    "password.showPassword": "Mostrar contraseña",
    "password.hidePassword": "Ocultar contraseña",
    "password.unlock": "Desbloquear",

    // Print dialog
    "print.title": "Imprimir",
    "print.pagesLabel": "Páginas",
    "print.allPages": "Todas las páginas",
    "print.currentPage": "Página actual ({page})",
    "print.pagesRange": "Páginas",
    "print.pagesTo": "a",
    "print.custom": "Personalizado",
    "print.customPlaceholder": "p. ej. 1,3,5-8",
    "print.qualityLabel": "Calidad",
    "print.qualityDraft": "Borrador (150 DPI)",
    "print.qualityStandard": "Estándar (300 DPI)",
    "print.qualityHigh": "Alta (600 DPI)",
    "print.cancel": "Cancelar",
    "print.print": "Imprimir",
    "print.errorPageRange": "Introduzca números de página entre 1 y {max}.",
    "print.errorStartEnd": "La página inicial debe ser menor o igual que la página final.",
    "print.errorCustomRange": 'Rango no válido. Use el formato "1,3,5-8". Las páginas deben estar entre 1 y {max}.',

    // Loading overlay
    "loading.connecting": "Conectando...",
    "loading.loading": "Cargando...",
    "loading.processing": "Procesando documento...",
    "loading.preparingPrint": "Preparando impresión...",
    "loading.renderingPage": "Renderizando página {current} de {total}...",
    "loading.progressSize": "{loaded} / {total} MB ({percent}%)",
    "loading.progressLoaded": "{loaded} MB cargados...",

    // View mode menu
    "viewMode.label": "Ajustes de vista",
    "viewMode.scroll": "Desplazamiento",
    "viewMode.layout": "Diseño",
    "viewMode.rotation": "Rotación",
    "viewMode.spacing": "Espaciado",
    "viewMode.spread": "Doble página",
    "viewMode.continuous": "Continuo",
    "viewMode.single": "Simple",
    "viewMode.double": "Doble",
    "viewMode.coverRight": "Portada a la derecha",
    "viewMode.coverLeft": "Portada a la izquierda",
    "viewMode.spacingAll": "Todo",
    "viewMode.spacingNone": "Ninguno",
    "viewMode.spacingSpread": "Doble página",
    "viewMode.spacingPage": "Página",

    // Annotation panel
    "annotations.comments": "Comentarios",
    "annotations.noComments": "No hay comentarios en este documento",
    "annotations.loading": "Cargando comentarios...",
    "annotations.replyCount": "{count} respuestas",
    "annotations.replyCountSingle": "1 respuesta",
    "annotations.showReplies": "Mostrar respuestas",
    "annotations.hideReplies": "Ocultar respuestas",
    "annotations.pageHeader": "Página {page}",

    // Outline panel
    "outline.label": "Índice del documento",
    "outline.loading": "Cargando índice...",
    "outline.empty": "No hay índice disponible",

    // Layers panel
    "layers.loading": "Cargando capas...",
    "layers.empty": "No hay capas en este documento",
    "layers.visibility": "Visibilidad de la capa {name}",

    // Thumbnail panel
    "thumbnails.label": "Miniaturas de páginas",
    "thumbnails.pageLabel": "Página {page}",

    // Left panel tabs
    "leftPanel.tabs": "Pestañas del panel",
    "leftPanel.thumbnails": "Miniaturas",
    "leftPanel.outline": "Índice",
    "leftPanel.bookmarks": "Marcadores",
    "leftPanel.layers": "Capas",
    "leftPanel.attachments": "Adjuntos",
    "leftPanel.resizeHandle": "Redimensionar panel lateral",

    // Right panel
    "rightPanel.searchPanel": "Panel de búsqueda",
    "rightPanel.commentsPanel": "Panel de comentarios",
    "rightPanel.resizeHandle": "Redimensionar panel",
};
