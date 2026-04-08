import type { TranslationKeys } from "./types.js";

export const ru: TranslationKeys = {
    // Shell / regions
    "shell.skipToDocument": "Перейти к документу",
    "shell.regionToolbar": "Панель инструментов",
    "shell.regionSidePanel": "Боковая панель",
    "shell.regionDocument": "Документ",
    "shell.regionSearchComments": "Поиск и комментарии",
    "shell.pageOfTotal": "Страница {page} из {pageCount}",
    "shell.zoomPercent": "Масштаб {percent}%",
    "shell.panelOpened": "Панель «{panel}» открыта",
    "shell.panelClosed": "Панель закрыта",
    "shell.shortcutHelp":
        "Сочетания клавиш: F6 — переход между областями, Ctrl+F — поиск, Ctrl+P — печать, " +
        "Ctrl+Plus — увеличить масштаб, Ctrl+Minus — уменьшить масштаб, Ctrl+0 — сбросить масштаб, Escape — закрыть панели. " +
        "Нажмите ? для просмотра списка сочетаний.",
    "shell.shortcutHelpAnnounce":
        "Сочетания клавиш: F6 переход между областями, Ctrl+F поиск, Ctrl+P печать, " +
        "Ctrl+Plus увеличить, Ctrl+Minus уменьшить, Ctrl+0 сбросить масштаб, Escape закрыть панель, " +
        "? показать эту справку.",

    // Toolbar
    "toolbar.label": "Панель инструментов документа",
    "toolbar.menu": "Меню",
    "toolbar.search": "Поиск",
    "toolbar.comments": "Комментарии",
    "toolbar.print": "Печать",
    "toolbar.download": "Скачать",
    "toolbar.fullscreen": "Во весь экран",
    "toolbar.exitFullscreen": "Выйти из полноэкранного режима",
    "toolbar.darkMode": "Тёмная тема",
    "toolbar.systemTheme": "Системная тема",
    "toolbar.lightMode": "Светлая тема",
    "toolbar.previousPage": "Предыдущая страница",
    "toolbar.nextPage": "Следующая страница",
    "toolbar.pageNumber": "Номер страницы",
    "toolbar.zoomIn": "Увеличить",
    "toolbar.zoomOut": "Уменьшить",
    "toolbar.zoomLevel": "Уровень масштаба",
    "toolbar.zoomOptions": "Параметры масштаба",
    "toolbar.zoomLevels": "Уровни масштаба",
    "toolbar.more": "Ещё",

    // Zoom modes
    "zoom.fitWidth": "По ширине",
    "zoom.fitHeight": "По высоте",
    "zoom.fitPage": "По размеру страницы",

    // Floating toolbar
    "floatingToolbar.label": "Навигация по страницам и масштаб",

    // Search panel
    "search.placeholder": "Поиск в документе...",
    "search.label": "Текст для поиска",
    "search.matchCase": "С учётом регистра",
    "search.previousMatch": "Предыдущее совпадение (Shift+Enter)",
    "search.nextMatch": "Следующее совпадение (Enter)",
    "search.loadingText": "Загрузка текста\u2026",
    "search.noResults": "Нет результатов",
    "search.resultStatus": "{current} из {total}",
    "search.pageHeader": "Страница {page}",
    "search.resultsLabel": "Результаты поиска",

    // Password dialog
    "password.title": "Требуется пароль",
    "password.message": "Этот документ защищён паролем. Введите пароль для открытия.",
    "password.placeholder": "Введите пароль",
    "password.label": "Пароль",
    "password.showPassword": "Показать пароль",
    "password.hidePassword": "Скрыть пароль",
    "password.unlock": "Разблокировать",

    // Print dialog
    "print.title": "Печать",
    "print.pagesLabel": "Страницы",
    "print.allPages": "Все страницы",
    "print.currentPage": "Текущая страница ({page})",
    "print.pagesRange": "Страницы",
    "print.pagesTo": "по",
    "print.custom": "Произвольный",
    "print.customPlaceholder": "напр. 1,3,5-8",
    "print.qualityLabel": "Качество",
    "print.qualityDraft": "Черновое (150 DPI)",
    "print.qualityStandard": "Стандартное (300 DPI)",
    "print.qualityHigh": "Высокое (600 DPI)",
    "print.cancel": "Отмена",
    "print.print": "Печать",
    "print.errorPageRange": "Введите номера страниц от 1 до {max}.",
    "print.errorStartEnd": "Начальная страница должна быть меньше или равна конечной.",
    "print.errorCustomRange":
        'Недопустимый диапазон. Используйте формат вида "1,3,5-8". Номера страниц должны быть от 1 до {max}.',

    // Loading overlay
    "loading.connecting": "Подключение...",
    "loading.loading": "Загрузка...",
    "loading.processing": "Обработка документа...",
    "loading.preparingPrint": "Подготовка к печати...",
    "loading.renderingPage": "Отрисовка страницы {current} из {total}...",
    "loading.progressSize": "{loaded} / {total} МБ ({percent}%)",
    "loading.progressLoaded": "Загружено {loaded} МБ...",

    // View mode menu
    "viewMode.label": "Настройки отображения",
    "viewMode.scroll": "Прокрутка",
    "viewMode.layout": "Макет",
    "viewMode.rotation": "Поворот",
    "viewMode.spacing": "Отступы",
    "viewMode.spread": "Разворот",
    "viewMode.continuous": "Непрерывный",
    "viewMode.single": "Одна страница",
    "viewMode.double": "Две страницы",
    "viewMode.coverRight": "Обложка справа",
    "viewMode.coverLeft": "Обложка слева",
    "viewMode.spacingAll": "Все",
    "viewMode.spacingNone": "Нет",
    "viewMode.spacingSpread": "Разворот",
    "viewMode.spacingPage": "Страница",

    // Annotation panel
    "annotations.comments": "Комментарии",
    "annotations.noComments": "В этом документе нет комментариев",
    "annotations.loading": "Загрузка комментариев...",
    "annotations.replyCount": "Ответов: {count}",
    "annotations.replyCountSingle": "1 ответ",
    "annotations.showReplies": "Показать ответы",
    "annotations.hideReplies": "Скрыть ответы",
    "annotations.pageHeader": "Страница {page}",

    // Outline panel
    "outline.label": "Оглавление документа",
    "outline.loading": "Загрузка оглавления...",
    "outline.empty": "В этом документе нет оглавления",

    // Bookmarks panel
    "bookmarks.empty": "В этом документе нет закладок",

    // Layers panel
    "layers.loading": "Загрузка слоёв...",
    "layers.empty": "В этом документе нет слоёв",

    // Attachments panel
    "attachments.empty": "В этом документе нет вложений",
    "layers.visibility": "Видимость слоя «{name}»",

    // Fonts panel
    "fonts.loading": "Загрузка шрифтов...",
    "fonts.empty": "Нет данных об использовании шрифтов",

    // Thumbnail panel
    "thumbnails.label": "Миниатюры страниц",
    "thumbnails.pageLabel": "Страница {page}",

    // Spread and viewport
    "spread.pageLabel": "Страница {page}",
    "spread.pageContent": "Содержимое страницы {page}",
    "spread.rendering": "Отрисовка...",
    "viewport.documentContent": "Содержимое документа",

    // Left panel tabs
    "leftPanel.tabs": "Вкладки панели",
    "leftPanel.thumbnails": "Миниатюры",
    "leftPanel.outline": "Оглавление",
    "leftPanel.bookmarks": "Закладки",
    "leftPanel.layers": "Слои",
    "leftPanel.attachments": "Вложения",
    "leftPanel.fonts": "Шрифты",
    "leftPanel.resizeHandle": "Изменить размер боковой панели",

    // Right panel
    "rightPanel.searchPanel": "Панель поиска",
    "rightPanel.commentsPanel": "Панель комментариев",
    "rightPanel.resizeHandle": "Изменить размер панели",
    // Tools
    "tools.pointer": "Pointer",
    "tools.hand": "Hand",
    "tools.zoom": "Zoom",
    "tools.annotate": "Annotate",
    "tools.markup": "Markup",
    "tools.subtoolbar": "Tool options",
    // Annotate sub-tools
    "tools.freehand": "Freehand",
    "tools.line": "Line",
    "tools.arrow": "Arrow",
    "tools.rectangle": "Rectangle",
    "tools.ellipse": "Ellipse",
    "tools.polygon": "Polygon",
    "tools.textbox": "Text box",
    // Markup sub-tools
    "tools.highlight": "Highlight",
    "tools.underline": "Underline",
    "tools.strikethrough": "Strikethrough",
    "tools.squiggly": "Squiggly",
    // Tool options
    "tools.strokeColor": "Цвет обводки",
    "tools.fillColor": "Цвет заливки",
    "tools.noFill": "Без заливки",
    "tools.strokeWidth": "Толщина обводки",
    "tools.opacity": "Непрозрачность",
    "tools.fontSize": "Размер шрифта",
    "tools.lineStyle": "Стиль линии",
    "tools.lineStyleSolid": "Сплошная",
    "tools.lineStyleDashed": "Пунктирная",
    "tools.lineStyleDotted": "Точечная",
    "tools.arrowHeadStart": "Начало",
    "tools.arrowHeadEnd": "Конец",
    "tools.arrowHeadNone": "Нет",
    "tools.arrowHeadOpen": "Открытая",
    "tools.arrowHeadClosed": "Закрытая",
};
