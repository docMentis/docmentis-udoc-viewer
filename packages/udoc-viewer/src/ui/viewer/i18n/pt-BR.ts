import type { TranslationKeys } from "./types.js";

export const ptBR: TranslationKeys = {
    // Shell / regions
    "shell.skipToDocument": "Ir para o documento",
    "shell.regionToolbar": "Barra de ferramentas",
    "shell.regionSidePanel": "Painel lateral",
    "shell.regionDocument": "Documento",
    "shell.regionSearchComments": "Pesquisa e comentários",
    "shell.pageOfTotal": "Página {page} de {pageCount}",
    "shell.zoomPercent": "Zoom {percent}%",
    "shell.panelOpened": "Painel {panel} aberto",
    "shell.panelClosed": "Painel fechado",
    "shell.shortcutHelp":
        "Atalhos de teclado: F6 para navegar entre regiões, Ctrl+F para pesquisar, Ctrl+P para imprimir, " +
        "Ctrl+Plus para aumentar o zoom, Ctrl+Minus para diminuir o zoom, Ctrl+0 para redefinir o zoom, Escape para fechar painéis. " +
        "Pressione ? para ver a lista de atalhos.",
    "shell.shortcutHelpAnnounce":
        "Atalhos de teclado: F6 navegar regiões, Ctrl+F pesquisar, Ctrl+P imprimir, " +
        "Ctrl+Plus aumentar zoom, Ctrl+Minus diminuir zoom, Ctrl+0 redefinir zoom, Escape fechar painel, " +
        "? exibir esta ajuda.",

    // Toolbar
    "toolbar.label": "Barra de ferramentas do documento",
    "toolbar.menu": "Menu",
    "toolbar.search": "Pesquisar",
    "toolbar.comments": "Comentários",
    "toolbar.print": "Imprimir",
    "toolbar.download": "Baixar",
    "toolbar.fullscreen": "Tela cheia",
    "toolbar.exitFullscreen": "Sair da tela cheia",
    "toolbar.darkMode": "Modo escuro",
    "toolbar.systemTheme": "Tema do sistema",
    "toolbar.lightMode": "Modo claro",
    "toolbar.previousPage": "Página anterior",
    "toolbar.nextPage": "Próxima página",
    "toolbar.pageNumber": "Número da página",
    "toolbar.zoomIn": "Aumentar zoom",
    "toolbar.zoomOut": "Diminuir zoom",
    "toolbar.zoomLevel": "Nível de zoom",
    "toolbar.zoomOptions": "Opções de zoom",
    "toolbar.zoomLevels": "Níveis de zoom",
    "toolbar.more": "Mais",

    // Zoom modes
    "zoom.fitWidth": "Ajustar à largura",
    "zoom.fitHeight": "Ajustar à altura",
    "zoom.fitPage": "Ajustar à página",

    // Floating toolbar
    "floatingToolbar.label": "Navegação de páginas e zoom",

    // Search panel
    "search.placeholder": "Pesquisar no documento...",
    "search.label": "Texto de pesquisa",
    "search.matchCase": "Diferenciar maiúsculas e minúsculas",
    "search.previousMatch": "Resultado anterior (Shift+Enter)",
    "search.nextMatch": "Próximo resultado (Enter)",
    "search.loadingText": "Carregando texto\u2026",
    "search.noResults": "Nenhum resultado",
    "search.resultStatus": "{current} de {total}",
    "search.pageHeader": "Página {page}",
    "search.resultsLabel": "Resultados da pesquisa",

    // Password dialog
    "password.title": "Senha necessária",
    "password.message": "Este documento é protegido. Digite a senha para abri-lo.",
    "password.placeholder": "Digite a senha",
    "password.label": "Senha",
    "password.showPassword": "Mostrar senha",
    "password.hidePassword": "Ocultar senha",
    "password.unlock": "Desbloquear",

    // Print dialog
    "print.title": "Imprimir",
    "print.pagesLabel": "Páginas",
    "print.allPages": "Todas as páginas",
    "print.currentPage": "Página atual ({page})",
    "print.pagesRange": "Páginas",
    "print.pagesTo": "até",
    "print.custom": "Personalizado",
    "print.customPlaceholder": "ex: 1,3,5-8",
    "print.qualityLabel": "Qualidade",
    "print.qualityDraft": "Rascunho (150 DPI)",
    "print.qualityStandard": "Padrão (300 DPI)",
    "print.qualityHigh": "Alta (600 DPI)",
    "print.cancel": "Cancelar",
    "print.print": "Imprimir",
    "print.errorPageRange": "Digite números de página entre 1 e {max}.",
    "print.errorStartEnd": "A página inicial deve ser menor ou igual à página final.",
    "print.errorCustomRange": 'Intervalo inválido. Use o formato "1,3,5-8". As páginas devem estar entre 1 e {max}.',

    // Loading overlay
    "loading.connecting": "Conectando...",
    "loading.loading": "Carregando...",
    "loading.processing": "Processando documento...",
    "loading.preparingPrint": "Preparando para imprimir...",
    "loading.renderingPage": "Renderizando página {current} de {total}...",
    "loading.progressSize": "{loaded} / {total} MB ({percent}%)",
    "loading.progressLoaded": "{loaded} MB carregados...",

    // View mode menu
    "viewMode.label": "Configurações de exibição",
    "viewMode.view": "Visualização",
    "viewMode.paged": "Paginado",
    "viewMode.continuousView": "Contínuo",
    "viewMode.scroll": "Rolagem",
    "viewMode.layout": "Layout",
    "viewMode.rotation": "Rotação",
    "viewMode.spacing": "Espaçamento",
    "viewMode.spread": "Páginas duplas",
    "viewMode.continuous": "Contínuo",
    "viewMode.single": "Simples",
    "viewMode.double": "Duplo",
    "viewMode.coverRight": "Capa à direita",
    "viewMode.coverLeft": "Capa à esquerda",
    "viewMode.spacingAll": "Todos",
    "viewMode.spacingNone": "Nenhum",
    "viewMode.spacingSpread": "Páginas duplas",
    "viewMode.spacingPage": "Página",

    // Annotation panel
    "annotations.comments": "Comentários",
    "annotations.noComments": "Nenhum comentário neste documento",
    "annotations.loading": "Carregando comentários...",
    "annotations.replyCount": "{count} respostas",
    "annotations.replyCountSingle": "1 resposta",
    "annotations.showReplies": "Mostrar respostas",
    "annotations.hideReplies": "Ocultar respostas",
    "annotations.pageHeader": "Página {page}",

    // Outline panel
    "outline.label": "Sumário do documento",
    "outline.loading": "Carregando sumário...",
    "outline.empty": "Nenhum sumário neste documento",

    // Bookmarks panel
    "bookmarks.empty": "Nenhum marcador neste documento",

    // Layers panel
    "layers.loading": "Carregando camadas...",
    "layers.empty": "Nenhuma camada neste documento",

    // Attachments panel
    "attachments.empty": "Nenhum anexo neste documento",
    "layers.visibility": "Visibilidade da camada {name}",

    // Fonts panel
    "fonts.loading": "Carregando fontes...",
    "fonts.empty": "Nenhum dado de fonte disponível",

    // Thumbnail panel
    "thumbnails.label": "Miniaturas das páginas",
    "thumbnails.pageLabel": "Página {page}",

    // Spread and viewport
    "spread.pageLabel": "Página {page}",
    "spread.pageContent": "Conteúdo da página {page}",
    "spread.rendering": "Renderizando...",
    "viewport.documentContent": "Conteúdo do documento",

    // Left panel tabs
    "leftPanel.tabs": "Abas do painel",
    "leftPanel.thumbnails": "Miniaturas",
    "leftPanel.outline": "Sumário",
    "leftPanel.bookmarks": "Marcadores",
    "leftPanel.layers": "Camadas",
    "leftPanel.attachments": "Anexos",
    "leftPanel.fonts": "Fontes",
    "leftPanel.resizeHandle": "Redimensionar painel lateral",

    // Right panel
    "rightPanel.searchPanel": "Painel de pesquisa",
    "rightPanel.commentsPanel": "Painel de comentários",
    "rightPanel.resizeHandle": "Redimensionar painel",
    // Tools
    "tools.pointer": "Ponteiro",
    "tools.hand": "Mão",
    "tools.zoom": "Zoom",
    "tools.annotate": "Anotar",
    "tools.markup": "Marcação",
    "tools.subtoolbar": "Opções de ferramenta",
    // Shared sub-tools
    "tools.select": "Selecionar",
    "tools.deleteAnnotation": "Excluir anotação",
    // Annotate sub-tools
    "tools.freehand": "Mão livre",
    "tools.line": "Linha",
    "tools.arrow": "Seta",
    "tools.rectangle": "Retângulo",
    "tools.ellipse": "Elipse",
    "tools.polygon": "Polígono",
    "tools.polyline": "Polilinha",
    "tools.textbox": "Caixa de texto",
    // Markup sub-tools
    "tools.highlight": "Realçar",
    "tools.underline": "Sublinhado",
    "tools.strikethrough": "Tachado",
    "tools.squiggly": "Ondulado",
    // Tool options
    "tools.strokeColor": "Cor do traço",
    "tools.fillColor": "Cor de preenchimento",
    "tools.noFill": "Sem preenchimento",
    "tools.strokeWidth": "Largura do traço",
    "tools.opacity": "Opacidade",
    "tools.fontSize": "Tamanho da fonte",
    "tools.lineStyle": "Estilo de linha",
    "tools.lineStyleSolid": "Sólido",
    "tools.lineStyleDashed": "Tracejado",
    "tools.lineStyleDotted": "Pontilhado",
    "tools.arrowHeadStart": "Início",
    "tools.arrowHeadEnd": "Final",
    "tools.arrowHeadNone": "Nenhuma",
    "tools.arrowHeadOpen": "Aberta",
    "tools.arrowHeadClosed": "Fechada",
    "tools.undo": "Desfazer",
    "tools.redo": "Refazer",
};
