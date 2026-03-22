import type { TranslationKeys } from "./types.js";

export const ar: TranslationKeys = {
    // Shell / regions
    "shell.skipToDocument": "انتقل إلى المستند",
    "shell.regionToolbar": "شريط الأدوات",
    "shell.regionSidePanel": "اللوحة الجانبية",
    "shell.regionDocument": "المستند",
    "shell.regionSearchComments": "البحث والتعليقات",
    "shell.pageOfTotal": "صفحة {page} من {pageCount}",
    "shell.zoomPercent": "تكبير {percent}%",
    "shell.panelOpened": "تم فتح لوحة {panel}",
    "shell.panelClosed": "تم إغلاق اللوحة",
    "shell.shortcutHelp":
        "اختصارات لوحة المفاتيح: F6 للتنقل بين الأقسام، Ctrl+F للبحث، Ctrl+P للطباعة، " +
        "Ctrl+Plus للتكبير، Ctrl+Minus للتصغير، Ctrl+0 لإعادة ضبط التكبير، Escape لإغلاق اللوحات. " +
        "اضغط ? لعرض قائمة الاختصارات.",
    "shell.shortcutHelpAnnounce":
        "اختصارات لوحة المفاتيح: F6 التنقل بين الأقسام، Ctrl+F البحث، Ctrl+P الطباعة، " +
        "Ctrl+Plus تكبير، Ctrl+Minus تصغير، Ctrl+0 إعادة ضبط التكبير، Escape إغلاق اللوحة، " +
        "? عرض هذه المساعدة.",

    // Toolbar
    "toolbar.label": "شريط أدوات المستند",
    "toolbar.menu": "القائمة",
    "toolbar.search": "بحث",
    "toolbar.comments": "تعليقات",
    "toolbar.print": "طباعة",
    "toolbar.download": "تنزيل",
    "toolbar.fullscreen": "ملء الشاشة",
    "toolbar.exitFullscreen": "الخروج من ملء الشاشة",
    "toolbar.darkMode": "الوضع الداكن",
    "toolbar.systemTheme": "سمة النظام",
    "toolbar.lightMode": "الوضع الفاتح",
    "toolbar.previousPage": "الصفحة السابقة",
    "toolbar.nextPage": "الصفحة التالية",
    "toolbar.pageNumber": "رقم الصفحة",
    "toolbar.zoomIn": "تكبير",
    "toolbar.zoomOut": "تصغير",
    "toolbar.zoomLevel": "مستوى التكبير",
    "toolbar.zoomOptions": "خيارات التكبير",
    "toolbar.zoomLevels": "مستويات التكبير",

    // Zoom modes
    "zoom.fitWidth": "ملاءمة العرض",
    "zoom.fitHeight": "ملاءمة الارتفاع",
    "zoom.fitPage": "ملاءمة الصفحة",

    // Floating toolbar
    "floatingToolbar.label": "التنقل بين الصفحات والتكبير",

    // Search panel
    "search.placeholder": "البحث في المستند...",
    "search.label": "نص البحث",
    "search.matchCase": "مطابقة حالة الأحرف",
    "search.previousMatch": "النتيجة السابقة (Shift+Enter)",
    "search.nextMatch": "النتيجة التالية (Enter)",
    "search.loadingText": "جارٍ تحميل النص\u2026",
    "search.noResults": "لا توجد نتائج",
    "search.resultStatus": "{current} من {total}",
    "search.pageHeader": "صفحة {page}",
    "search.resultsLabel": "نتائج البحث",

    // Password dialog
    "password.title": "كلمة المرور مطلوبة",
    "password.message": "هذا المستند محمي. يرجى إدخال كلمة المرور لفتحه.",
    "password.placeholder": "أدخل كلمة المرور",
    "password.label": "كلمة المرور",
    "password.showPassword": "إظهار كلمة المرور",
    "password.hidePassword": "إخفاء كلمة المرور",
    "password.unlock": "فتح القفل",

    // Print dialog
    "print.title": "طباعة",
    "print.pagesLabel": "الصفحات",
    "print.allPages": "جميع الصفحات",
    "print.currentPage": "الصفحة الحالية ({page})",
    "print.pagesRange": "الصفحات",
    "print.pagesTo": "إلى",
    "print.custom": "مخصص",
    "print.customPlaceholder": "مثال: 1,3,5-8",
    "print.qualityLabel": "الجودة",
    "print.qualityDraft": "مسودة (150 DPI)",
    "print.qualityStandard": "قياسية (300 DPI)",
    "print.qualityHigh": "عالية (600 DPI)",
    "print.cancel": "إلغاء",
    "print.print": "طباعة",
    "print.errorPageRange": "يرجى إدخال أرقام صفحات بين 1 و{max}.",
    "print.errorStartEnd": "يجب أن تكون صفحة البداية أقل من أو تساوي صفحة النهاية.",
    "print.errorCustomRange": 'نطاق غير صالح. استخدم تنسيقًا مثل "1,3,5-8". يجب أن تكون الصفحات بين 1 و{max}.',

    // Loading overlay
    "loading.connecting": "جارٍ الاتصال...",
    "loading.loading": "جارٍ التحميل...",
    "loading.processing": "جارٍ معالجة المستند...",
    "loading.preparingPrint": "جارٍ التحضير للطباعة...",
    "loading.renderingPage": "جارٍ عرض الصفحة {current} من {total}...",
    "loading.progressSize": "{loaded} / {total} ميغابايت ({percent}%)",
    "loading.progressLoaded": "تم تحميل {loaded} ميغابايت...",

    // View mode menu
    "viewMode.label": "إعدادات العرض",
    "viewMode.scroll": "التمرير",
    "viewMode.layout": "التخطيط",
    "viewMode.rotation": "التدوير",
    "viewMode.spacing": "التباعد",
    "viewMode.spread": "العرض المزدوج",
    "viewMode.continuous": "متواصل",
    "viewMode.single": "مفرد",
    "viewMode.double": "مزدوج",
    "viewMode.coverRight": "غلاف يمين",
    "viewMode.coverLeft": "غلاف يسار",
    "viewMode.spacingAll": "الكل",
    "viewMode.spacingNone": "بدون",
    "viewMode.spacingSpread": "العرض المزدوج",
    "viewMode.spacingPage": "الصفحة",

    // Annotation panel
    "annotations.comments": "التعليقات",
    "annotations.noComments": "لا توجد تعليقات في هذا المستند",
    "annotations.loading": "جارٍ تحميل التعليقات...",
    "annotations.replyCount": "{count} ردود",
    "annotations.replyCountSingle": "رد واحد",
    "annotations.showReplies": "عرض الردود",
    "annotations.hideReplies": "إخفاء الردود",
    "annotations.pageHeader": "صفحة {page}",

    // Outline panel
    "outline.label": "فهرس المستند",
    "outline.loading": "جارٍ تحميل الفهرس...",
    "outline.empty": "لا يوجد فهرس متاح",

    // Layers panel
    "layers.loading": "جارٍ تحميل الطبقات...",
    "layers.empty": "لا توجد طبقات في هذا المستند",
    "layers.visibility": "إظهار/إخفاء طبقة {name}",

    // Thumbnail panel
    "thumbnails.label": "صور مصغرة للصفحات",
    "thumbnails.pageLabel": "صفحة {page}",

    // Left panel tabs
    "leftPanel.tabs": "علامات تبويب اللوحة",
    "leftPanel.thumbnails": "صور مصغرة",
    "leftPanel.outline": "الفهرس",
    "leftPanel.bookmarks": "الإشارات المرجعية",
    "leftPanel.layers": "الطبقات",
    "leftPanel.attachments": "المرفقات",
    "leftPanel.resizeHandle": "تغيير حجم اللوحة الجانبية",

    // Right panel
    "rightPanel.searchPanel": "لوحة البحث",
    "rightPanel.commentsPanel": "لوحة التعليقات",
    "rightPanel.resizeHandle": "تغيير حجم اللوحة",
};
