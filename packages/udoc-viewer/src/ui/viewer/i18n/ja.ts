import type { TranslationKeys } from "./types.js";

export const ja: TranslationKeys = {
    // Shell / regions
    "shell.skipToDocument": "文書へスキップ",
    "shell.regionToolbar": "ツールバー",
    "shell.regionSidePanel": "サイドパネル",
    "shell.regionDocument": "文書",
    "shell.regionSearchComments": "検索とコメント",
    "shell.pageOfTotal": "{pageCount}ページ中{page}ページ",
    "shell.zoomPercent": "ズーム {percent}%",
    "shell.panelOpened": "{panel}パネルを開きました",
    "shell.panelClosed": "パネルを閉じました",
    "shell.shortcutHelp":
        "キーボードショートカット: F6で領域間を移動、Ctrl+Fで検索、Ctrl+Pで印刷、" +
        "Ctrl+Plusでズームイン、Ctrl+Minusでズームアウト、Ctrl+0でズームをリセット、Escapeでパネルを閉じる。" +
        "?キーでショートカット一覧を表示。",
    "shell.shortcutHelpAnnounce":
        "キーボードショートカット: F6 領域間移動、Ctrl+F 検索、Ctrl+P 印刷、" +
        "Ctrl+Plus ズームイン、Ctrl+Minus ズームアウト、Ctrl+0 ズームリセット、Escape パネルを閉じる、" +
        "? このヘルプを表示。",

    // Toolbar
    "toolbar.label": "文書ツールバー",
    "toolbar.menu": "メニュー",
    "toolbar.search": "検索",
    "toolbar.comments": "コメント",
    "toolbar.print": "印刷",
    "toolbar.download": "ダウンロード",
    "toolbar.fullscreen": "全画面表示",
    "toolbar.exitFullscreen": "全画面表示を終了",
    "toolbar.darkMode": "ダークモード",
    "toolbar.systemTheme": "システムテーマ",
    "toolbar.lightMode": "ライトモード",
    "toolbar.previousPage": "前のページ",
    "toolbar.nextPage": "次のページ",
    "toolbar.pageNumber": "ページ番号",
    "toolbar.zoomIn": "ズームイン",
    "toolbar.zoomOut": "ズームアウト",
    "toolbar.zoomLevel": "ズームレベル",
    "toolbar.zoomOptions": "ズームオプション",
    "toolbar.zoomLevels": "ズームレベル一覧",
    "toolbar.more": "その他",

    // Zoom modes
    "zoom.fitWidth": "幅に合わせる",
    "zoom.fitHeight": "高さに合わせる",
    "zoom.fitPage": "ページに合わせる",

    // Floating toolbar
    "floatingToolbar.label": "ページナビゲーションとズーム",

    // Search panel
    "search.placeholder": "文書内を検索...",
    "search.label": "検索テキスト",
    "search.matchCase": "大文字と小文字を区別",
    "search.previousMatch": "前の一致 (Shift+Enter)",
    "search.nextMatch": "次の一致 (Enter)",
    "search.loadingText": "テキストを読み込み中\u2026",
    "search.noResults": "結果なし",
    "search.resultStatus": "{total}件中{current}件目",
    "search.pageHeader": "{page}ページ",
    "search.resultsLabel": "検索結果",

    // Password dialog
    "password.title": "パスワードが必要です",
    "password.message": "この文書は保護されています。パスワードを入力して開いてください。",
    "password.placeholder": "パスワードを入力",
    "password.label": "パスワード",
    "password.showPassword": "パスワードを表示",
    "password.hidePassword": "パスワードを非表示",
    "password.unlock": "ロック解除",

    // Print dialog
    "print.title": "印刷",
    "print.pagesLabel": "ページ",
    "print.allPages": "すべてのページ",
    "print.currentPage": "現在のページ ({page})",
    "print.pagesRange": "ページ範囲",
    "print.pagesTo": "〜",
    "print.custom": "カスタム",
    "print.customPlaceholder": "例: 1,3,5-8",
    "print.qualityLabel": "品質",
    "print.qualityDraft": "下書き (150 DPI)",
    "print.qualityStandard": "標準 (300 DPI)",
    "print.qualityHigh": "高品質 (600 DPI)",
    "print.cancel": "キャンセル",
    "print.print": "印刷",
    "print.errorPageRange": "1から{max}までのページ番号を入力してください。",
    "print.errorStartEnd": "開始ページは終了ページ以下にしてください。",
    "print.errorCustomRange":
        "無効な範囲です。「1,3,5-8」のような形式で入力してください。ページ番号は1から{max}の間で指定してください。",

    // Loading overlay
    "loading.connecting": "接続中...",
    "loading.loading": "読み込み中...",
    "loading.processing": "文書を処理中...",
    "loading.preparingPrint": "印刷を準備中...",
    "loading.renderingPage": "{total}ページ中{current}ページをレンダリング中...",
    "loading.progressSize": "{loaded} / {total} MB ({percent}%)",
    "loading.progressLoaded": "{loaded} MB 読み込み済み...",

    // View mode menu
    "viewMode.label": "表示設定",
    "viewMode.scroll": "スクロール",
    "viewMode.layout": "レイアウト",
    "viewMode.rotation": "回転",
    "viewMode.spacing": "間隔",
    "viewMode.spread": "見開き",
    "viewMode.continuous": "連続",
    "viewMode.single": "単一",
    "viewMode.double": "見開き",
    "viewMode.coverRight": "表紙右",
    "viewMode.coverLeft": "表紙左",
    "viewMode.spacingAll": "すべて",
    "viewMode.spacingNone": "なし",
    "viewMode.spacingSpread": "見開き",
    "viewMode.spacingPage": "ページ",

    // Annotation panel
    "annotations.comments": "コメント",
    "annotations.noComments": "この文書にコメントはありません",
    "annotations.loading": "コメントを読み込み中...",
    "annotations.replyCount": "{count}件の返信",
    "annotations.replyCountSingle": "1件の返信",
    "annotations.showReplies": "返信を表示",
    "annotations.hideReplies": "返信を非表示",
    "annotations.pageHeader": "{page}ページ",

    // Outline panel
    "outline.label": "文書のアウトライン",
    "outline.loading": "アウトラインを読み込み中...",
    "outline.empty": "この文書にアウトラインはありません",

    // Bookmarks panel
    "bookmarks.empty": "この文書にブックマークはありません",

    // Layers panel
    "layers.loading": "レイヤーを読み込み中...",
    "layers.empty": "この文書にレイヤーはありません",

    // Attachments panel
    "attachments.empty": "この文書に添付ファイルはありません",
    "layers.visibility": "{name}レイヤーの表示切替",

    // Fonts panel
    "fonts.loading": "フォントを読み込み中...",
    "fonts.empty": "フォント使用データがありません",

    // Thumbnail panel
    "thumbnails.label": "ページサムネイル",
    "thumbnails.pageLabel": "{page}ページ",

    // Spread and viewport
    "spread.pageLabel": "{page} ページ",
    "spread.pageContent": "{page} ページの内容",
    "spread.rendering": "レンダリング中...",
    "viewport.documentContent": "ドキュメントコンテンツ",

    // Left panel tabs
    "leftPanel.tabs": "パネルタブ",
    "leftPanel.thumbnails": "サムネイル",
    "leftPanel.outline": "アウトライン",
    "leftPanel.bookmarks": "ブックマーク",
    "leftPanel.layers": "レイヤー",
    "leftPanel.attachments": "添付ファイル",
    "leftPanel.fonts": "フォント",
    "leftPanel.resizeHandle": "サイドパネルのサイズ変更",

    // Right panel
    "rightPanel.searchPanel": "検索パネル",
    "rightPanel.commentsPanel": "コメントパネル",
    "rightPanel.resizeHandle": "パネルのサイズ変更",
    // Tools
    "tools.pointer": "Pointer",
    "tools.hand": "Hand",
    "tools.zoom": "Zoom",
    "tools.annotate": "Annotate",
    "tools.markup": "Markup",
    "tools.subtoolbar": "Tool options",
    // Shared sub-tools
    "tools.select": "Select",
    "tools.deleteAnnotation": "Delete annotation",
    // Annotate sub-tools
    "tools.freehand": "Freehand",
    "tools.line": "Line",
    "tools.arrow": "Arrow",
    "tools.rectangle": "Rectangle",
    "tools.ellipse": "Ellipse",
    "tools.polygon": "Polygon",
    "tools.polyline": "Polyline",
    "tools.textbox": "Text box",
    // Markup sub-tools
    "tools.highlight": "Highlight",
    "tools.underline": "Underline",
    "tools.strikethrough": "Strikethrough",
    "tools.squiggly": "Squiggly",
    // Tool options
    "tools.strokeColor": "線の色",
    "tools.fillColor": "塗りの色",
    "tools.noFill": "塗りなし",
    "tools.strokeWidth": "線の太さ",
    "tools.opacity": "不透明度",
    "tools.fontSize": "フォントサイズ",
    "tools.lineStyle": "線のスタイル",
    "tools.lineStyleSolid": "実線",
    "tools.lineStyleDashed": "破線",
    "tools.lineStyleDotted": "点線",
    "tools.arrowHeadStart": "始点",
    "tools.arrowHeadEnd": "終点",
    "tools.arrowHeadNone": "なし",
    "tools.arrowHeadOpen": "開いた",
    "tools.arrowHeadClosed": "閉じた",
};
