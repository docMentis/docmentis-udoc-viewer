import type { TranslationKeys } from "./types.js";

export const zhCN: TranslationKeys = {
    // Shell / regions
    "shell.skipToDocument": "跳转到文档",
    "shell.regionToolbar": "工具栏",
    "shell.regionSidePanel": "侧边面板",
    "shell.regionDocument": "文档",
    "shell.regionSearchComments": "搜索与批注",
    "shell.pageOfTotal": "第 {page} 页，共 {pageCount} 页",
    "shell.zoomPercent": "缩放 {percent}%",
    "shell.panelOpened": "{panel}面板已打开",
    "shell.panelClosed": "面板已关闭",
    "shell.shortcutHelp":
        "快捷键：F6 切换区域，Ctrl+F 搜索，Ctrl+P 打印，" +
        "Ctrl+Plus 放大，Ctrl+Minus 缩小，Ctrl+0 重置缩放，Escape 关闭面板。" +
        "按 ? 查看快捷键列表。",
    "shell.shortcutHelpAnnounce":
        "快捷键：F6 切换区域，Ctrl+F 搜索，Ctrl+P 打印，" +
        "Ctrl+Plus 放大，Ctrl+Minus 缩小，Ctrl+0 重置缩放，Escape 关闭面板，" +
        "? 显示此帮助。",

    // Toolbar
    "toolbar.label": "文档工具栏",
    "toolbar.menu": "菜单",
    "toolbar.search": "搜索",
    "toolbar.comments": "批注",
    "toolbar.print": "打印",
    "toolbar.download": "下载",
    "toolbar.fullscreen": "全屏",
    "toolbar.exitFullscreen": "退出全屏",
    "toolbar.darkMode": "深色模式",
    "toolbar.systemTheme": "跟随系统",
    "toolbar.lightMode": "浅色模式",
    "toolbar.previousPage": "上一页",
    "toolbar.nextPage": "下一页",
    "toolbar.pageNumber": "页码",
    "toolbar.zoomIn": "放大",
    "toolbar.zoomOut": "缩小",
    "toolbar.zoomLevel": "缩放级别",
    "toolbar.zoomOptions": "缩放选项",
    "toolbar.zoomLevels": "缩放级别",

    // Zoom modes
    "zoom.fitWidth": "适合宽度",
    "zoom.fitHeight": "适合高度",
    "zoom.fitPage": "适合页面",

    // Floating toolbar
    "floatingToolbar.label": "页面导航与缩放",

    // Search panel
    "search.placeholder": "在文档中搜索…",
    "search.label": "搜索文本",
    "search.matchCase": "区分大小写",
    "search.previousMatch": "上一个匹配 (Shift+Enter)",
    "search.nextMatch": "下一个匹配 (Enter)",
    "search.loadingText": "正在加载文本…",
    "search.noResults": "无结果",
    "search.resultStatus": "第 {current} 项，共 {total} 项",
    "search.pageHeader": "第 {page} 页",
    "search.resultsLabel": "搜索结果",

    // Password dialog
    "password.title": "需要密码",
    "password.message": "此文档受密码保护，请输入密码以打开。",
    "password.placeholder": "输入密码",
    "password.label": "密码",
    "password.showPassword": "显示密码",
    "password.hidePassword": "隐藏密码",
    "password.unlock": "解锁",

    // Print dialog
    "print.title": "打印",
    "print.pagesLabel": "页面范围",
    "print.allPages": "全部页面",
    "print.currentPage": "当前页 ({page})",
    "print.pagesRange": "页面范围",
    "print.pagesTo": "至",
    "print.custom": "自定义",
    "print.customPlaceholder": "例如 1,3,5-8",
    "print.qualityLabel": "质量",
    "print.qualityDraft": "草稿 (150 DPI)",
    "print.qualityStandard": "标准 (300 DPI)",
    "print.qualityHigh": "高质量 (600 DPI)",
    "print.cancel": "取消",
    "print.print": "打印",
    "print.errorPageRange": "请输入 1 到 {max} 之间的页码。",
    "print.errorStartEnd": "起始页不能大于结束页。",
    "print.errorCustomRange": '格式无效，请使用类似 "1,3,5-8" 的格式。页码须在 1 到 {max} 之间。',

    // Loading overlay
    "loading.connecting": "正在连接…",
    "loading.loading": "正在加载…",
    "loading.processing": "正在处理文档…",
    "loading.preparingPrint": "正在准备打印…",
    "loading.renderingPage": "正在渲染第 {current} 页，共 {total} 页…",
    "loading.progressSize": "{loaded} / {total} MB ({percent}%)",
    "loading.progressLoaded": "已加载 {loaded} MB…",

    // View mode menu
    "viewMode.label": "视图设置",
    "viewMode.scroll": "滚动",
    "viewMode.layout": "布局",
    "viewMode.rotation": "旋转",
    "viewMode.spacing": "间距",
    "viewMode.spread": "跨页",
    "viewMode.continuous": "连续",
    "viewMode.single": "单页",
    "viewMode.double": "双页",
    "viewMode.coverRight": "封面居右",
    "viewMode.coverLeft": "封面居左",
    "viewMode.spacingAll": "全部",
    "viewMode.spacingNone": "无",
    "viewMode.spacingSpread": "跨页",
    "viewMode.spacingPage": "页间",

    // Annotation panel
    "annotations.comments": "批注",
    "annotations.noComments": "此文档暂无批注",
    "annotations.loading": "正在加载批注…",
    "annotations.replyCount": "{count} 条回复",
    "annotations.replyCountSingle": "1 条回复",
    "annotations.showReplies": "展开回复",
    "annotations.hideReplies": "收起回复",
    "annotations.pageHeader": "第 {page} 页",

    // Outline panel
    "outline.label": "文档大纲",
    "outline.loading": "正在加载大纲…",
    "outline.empty": "此文档暂无大纲",

    // Bookmarks panel
    "bookmarks.empty": "此文档暂无书签",

    // Layers panel
    "layers.loading": "正在加载图层…",
    "layers.empty": "此文档暂无图层",

    // Attachments panel
    "attachments.empty": "此文档暂无附件",
    "layers.visibility": "{name} 图层可见性",

    // Thumbnail panel
    "thumbnails.label": "页面缩略图",
    "thumbnails.pageLabel": "第 {page} 页",

    // Spread and viewport
    "spread.pageLabel": "第 {page} 页",
    "spread.pageContent": "第 {page} 页内容",
    "spread.rendering": "渲染中...",
    "viewport.documentContent": "文档内容",

    // Left panel tabs
    "leftPanel.tabs": "面板选项卡",
    "leftPanel.thumbnails": "缩略图",
    "leftPanel.outline": "大纲",
    "leftPanel.bookmarks": "书签",
    "leftPanel.layers": "图层",
    "leftPanel.attachments": "附件",
    "leftPanel.resizeHandle": "调整侧边面板大小",

    // Right panel
    "rightPanel.searchPanel": "搜索面板",
    "rightPanel.commentsPanel": "批注面板",
    "rightPanel.resizeHandle": "调整面板大小",
};
