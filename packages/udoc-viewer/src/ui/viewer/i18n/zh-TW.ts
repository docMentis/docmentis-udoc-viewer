import type { TranslationKeys } from "./types.js";

export const zhTW: TranslationKeys = {
    // Shell / regions
    "shell.skipToDocument": "跳至文件",
    "shell.regionToolbar": "工具列",
    "shell.regionSidePanel": "側邊面板",
    "shell.regionDocument": "文件",
    "shell.regionSearchComments": "搜尋與註解",
    "shell.pageOfTotal": "第 {page} 頁，共 {pageCount} 頁",
    "shell.zoomPercent": "縮放 {percent}%",
    "shell.panelOpened": "{panel}面板已開啟",
    "shell.panelClosed": "面板已關閉",
    "shell.shortcutHelp":
        "快速鍵：F6 切換區域，Ctrl+F 搜尋，Ctrl+P 列印，" +
        "Ctrl+Plus 放大，Ctrl+Minus 縮小，Ctrl+0 重設縮放，Escape 關閉面板。" +
        "按 ? 檢視快速鍵列表。",
    "shell.shortcutHelpAnnounce":
        "快速鍵：F6 切換區域，Ctrl+F 搜尋，Ctrl+P 列印，" +
        "Ctrl+Plus 放大，Ctrl+Minus 縮小，Ctrl+0 重設縮放，Escape 關閉面板，" +
        "? 顯示此說明。",

    // Toolbar
    "toolbar.label": "文件工具列",
    "toolbar.menu": "選單",
    "toolbar.search": "搜尋",
    "toolbar.comments": "註解",
    "toolbar.print": "列印",
    "toolbar.download": "下載",
    "toolbar.fullscreen": "全螢幕",
    "toolbar.exitFullscreen": "退出全螢幕",
    "toolbar.darkMode": "深色模式",
    "toolbar.systemTheme": "跟隨系統",
    "toolbar.lightMode": "淺色模式",
    "toolbar.previousPage": "上一頁",
    "toolbar.nextPage": "下一頁",
    "toolbar.pageNumber": "頁碼",
    "toolbar.zoomIn": "放大",
    "toolbar.zoomOut": "縮小",
    "toolbar.zoomLevel": "縮放層級",
    "toolbar.zoomOptions": "縮放選項",
    "toolbar.zoomLevels": "縮放層級",
    "toolbar.more": "更多",

    // Zoom modes
    "zoom.fitWidth": "符合寬度",
    "zoom.fitHeight": "符合高度",
    "zoom.fitPage": "符合頁面",

    // Floating toolbar
    "floatingToolbar.label": "頁面導覽與縮放",

    // Search panel
    "search.placeholder": "在文件中搜尋…",
    "search.label": "搜尋文字",
    "search.matchCase": "區分大小寫",
    "search.fuzzyMatch": "模糊比對",
    "search.previousMatch": "上一個符合項目 (Shift+Enter)",
    "search.nextMatch": "下一個符合項目 (Enter)",
    "search.loadingText": "正在載入文字…",
    "search.noResults": "沒有結果",
    "search.resultStatus": "第 {current} 項，共 {total} 項",
    "search.pageHeader": "第 {page} 頁",
    "search.resultsLabel": "搜尋結果",

    // Password dialog
    "password.title": "需要密碼",
    "password.message": "此文件受密碼保護，請輸入密碼以開啟。",
    "password.placeholder": "輸入密碼",
    "password.label": "密碼",
    "password.showPassword": "顯示密碼",
    "password.hidePassword": "隱藏密碼",
    "password.unlock": "解鎖",

    // Print dialog
    "print.title": "列印",
    "print.pagesLabel": "頁面範圍",
    "print.allPages": "所有頁面",
    "print.currentPage": "目前頁面 ({page})",
    "print.pagesRange": "頁面範圍",
    "print.pagesTo": "至",
    "print.custom": "自訂",
    "print.customPlaceholder": "例如 1,3,5-8",
    "print.qualityLabel": "品質",
    "print.qualityDraft": "草稿 (150 DPI)",
    "print.qualityStandard": "標準 (300 DPI)",
    "print.qualityHigh": "高品質 (600 DPI)",
    "print.cancel": "取消",
    "print.print": "列印",
    "print.errorPageRange": "請輸入 1 到 {max} 之間的頁碼。",
    "print.errorStartEnd": "起始頁不可大於結束頁。",
    "print.errorCustomRange": '格式無效，請使用類似 "1,3,5-8" 的格式。頁碼須介於 1 到 {max} 之間。',

    // Loading overlay
    "loading.connecting": "正在連線…",
    "loading.loading": "正在載入…",
    "loading.processing": "正在處理文件…",
    "loading.preparingPrint": "正在準備列印…",
    "loading.renderingPage": "正在算繪第 {current} 頁，共 {total} 頁…",
    "loading.progressSize": "{loaded} / {total} MB ({percent}%)",
    "loading.progressLoaded": "已載入 {loaded} MB…",

    // View mode menu
    "viewMode.label": "檢視設定",
    "viewMode.view": "檢視",
    "viewMode.paged": "分頁",
    "viewMode.continuousView": "連續",
    "viewMode.scroll": "捲動",
    "viewMode.layout": "版面",
    "viewMode.rotation": "旋轉",
    "viewMode.spacing": "間距",
    "viewMode.spread": "跨頁",
    "viewMode.continuous": "連續",
    "viewMode.single": "單頁",
    "viewMode.double": "雙頁",
    "viewMode.coverRight": "封面居右",
    "viewMode.coverLeft": "封面居左",
    "viewMode.spacingAll": "全部",
    "viewMode.spacingNone": "無",
    "viewMode.spacingSpread": "跨頁",
    "viewMode.spacingPage": "頁間",

    // Annotation panel
    "annotations.comments": "註解",
    "annotations.noComments": "此文件沒有註解",
    "annotations.loading": "正在載入註解…",
    "annotations.replyCount": "{count} 則回覆",
    "annotations.replyCountSingle": "1 則回覆",
    "annotations.showReplies": "展開回覆",
    "annotations.hideReplies": "收合回覆",
    "annotations.pageHeader": "第 {page} 頁",

    // Outline panel
    "outline.label": "文件大綱",
    "outline.loading": "正在載入大綱…",
    "outline.empty": "此文件沒有大綱",

    // Bookmarks panel
    "bookmarks.empty": "此文件沒有書籤",

    // Layers panel
    "layers.loading": "正在載入圖層…",
    "layers.empty": "此文件沒有圖層",

    // Attachments panel
    "attachments.empty": "此文件沒有附件",
    "layers.visibility": "{name} 圖層可見性",

    // Fonts panel
    "fonts.loading": "正在載入字型…",
    "fonts.empty": "暫無字型使用資料",

    // Thumbnail panel
    "thumbnails.label": "頁面縮圖",
    "thumbnails.pageLabel": "第 {page} 頁",

    // Spread and viewport
    "spread.pageLabel": "第 {page} 頁",
    "spread.pageContent": "第 {page} 頁內容",
    "spread.rendering": "渲染中...",
    "viewport.documentContent": "文件內容",

    // Left panel tabs
    "leftPanel.tabs": "面板分頁",
    "leftPanel.thumbnails": "縮圖",
    "leftPanel.outline": "大綱",
    "leftPanel.bookmarks": "書籤",
    "leftPanel.layers": "圖層",
    "leftPanel.attachments": "附件",
    "leftPanel.fonts": "字型",
    "leftPanel.resizeHandle": "調整側邊面板大小",

    // Right panel
    "rightPanel.searchPanel": "搜尋面板",
    "rightPanel.commentsPanel": "註解面板",
    "rightPanel.resizeHandle": "調整面板大小",
    // Tools
    "tools.pointer": "指標",
    "tools.hand": "抓手",
    "tools.zoom": "縮放",
    "tools.annotate": "註解",
    "tools.markup": "標記",
    "tools.subtoolbar": "工具選項",
    // Shared sub-tools
    "tools.select": "選取",
    "tools.deleteAnnotation": "刪除註解",
    // Annotate sub-tools
    "tools.freehand": "手繪",
    "tools.line": "直線",
    "tools.arrow": "箭頭",
    "tools.rectangle": "矩形",
    "tools.ellipse": "橢圓",
    "tools.polygon": "多邊形",
    "tools.polyline": "折線",
    "tools.textbox": "文字方塊",
    // Markup sub-tools
    "tools.highlight": "螢光標記",
    "tools.underline": "底線",
    "tools.strikethrough": "刪除線",
    "tools.squiggly": "波浪線",
    // Tool options
    "tools.strokeColor": "描邊顏色",
    "tools.fillColor": "填充顏色",
    "tools.noFill": "無填充",
    "tools.strokeWidth": "描邊寬度",
    "tools.opacity": "不透明度",
    "tools.fontSize": "字型大小",
    "tools.lineStyle": "線條樣式",
    "tools.lineStyleSolid": "實線",
    "tools.lineStyleDashed": "虛線",
    "tools.lineStyleDotted": "點線",
    "tools.arrowHeadStart": "起點",
    "tools.arrowHeadEnd": "終點",
    "tools.arrowHeadNone": "無",
    "tools.arrowHeadOpen": "開放",
    "tools.arrowHeadClosed": "封閉",
    "tools.undo": "復原",
    "tools.redo": "重做",
};
