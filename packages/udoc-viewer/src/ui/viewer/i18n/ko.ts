import type { TranslationKeys } from "./types.js";

export const ko: TranslationKeys = {
    // Shell / regions
    "shell.skipToDocument": "문서로 건너뛰기",
    "shell.regionToolbar": "도구 모음",
    "shell.regionSidePanel": "사이드 패널",
    "shell.regionDocument": "문서",
    "shell.regionSearchComments": "검색 및 댓글",
    "shell.pageOfTotal": "{pageCount}페이지 중 {page}페이지",
    "shell.zoomPercent": "확대/축소 {percent}%",
    "shell.panelOpened": "{panel} 패널 열림",
    "shell.panelClosed": "패널 닫힘",
    "shell.shortcutHelp":
        "키보드 단축키: F6으로 영역 간 이동, Ctrl+F로 검색, Ctrl+P로 인쇄, " +
        "Ctrl+Plus로 확대, Ctrl+Minus로 축소, Ctrl+0으로 확대/축소 초기화, Escape로 패널 닫기. " +
        "?키를 눌러 단축키 목록을 확인하세요.",
    "shell.shortcutHelpAnnounce":
        "키보드 단축키: F6 영역 간 이동, Ctrl+F 검색, Ctrl+P 인쇄, " +
        "Ctrl+Plus 확대, Ctrl+Minus 축소, Ctrl+0 확대/축소 초기화, Escape 패널 닫기, " +
        "? 이 도움말 표시.",

    // Toolbar
    "toolbar.label": "문서 도구 모음",
    "toolbar.menu": "메뉴",
    "toolbar.search": "검색",
    "toolbar.comments": "댓글",
    "toolbar.print": "인쇄",
    "toolbar.download": "다운로드",
    "toolbar.fullscreen": "전체 화면",
    "toolbar.exitFullscreen": "전체 화면 종료",
    "toolbar.darkMode": "다크 모드",
    "toolbar.systemTheme": "시스템 테마",
    "toolbar.lightMode": "라이트 모드",
    "toolbar.previousPage": "이전 페이지",
    "toolbar.nextPage": "다음 페이지",
    "toolbar.pageNumber": "페이지 번호",
    "toolbar.zoomIn": "확대",
    "toolbar.zoomOut": "축소",
    "toolbar.zoomLevel": "확대/축소 수준",
    "toolbar.zoomOptions": "확대/축소 옵션",
    "toolbar.zoomLevels": "확대/축소 수준 목록",
    "toolbar.more": "더보기",

    // Zoom modes
    "zoom.fitWidth": "너비에 맞추기",
    "zoom.fitHeight": "높이에 맞추기",
    "zoom.fitPage": "페이지에 맞추기",

    // Floating toolbar
    "floatingToolbar.label": "페이지 탐색 및 확대/축소",

    // Search panel
    "search.placeholder": "문서에서 검색...",
    "search.label": "검색 텍스트",
    "search.matchCase": "대소문자 구분",
    "search.previousMatch": "이전 일치 (Shift+Enter)",
    "search.nextMatch": "다음 일치 (Enter)",
    "search.loadingText": "텍스트 로딩 중\u2026",
    "search.noResults": "결과 없음",
    "search.resultStatus": "{total}개 중 {current}번째",
    "search.pageHeader": "{page}페이지",
    "search.resultsLabel": "검색 결과",

    // Password dialog
    "password.title": "비밀번호 필요",
    "password.message": "이 문서는 보호되어 있습니다. 비밀번호를 입력하여 열어주세요.",
    "password.placeholder": "비밀번호 입력",
    "password.label": "비밀번호",
    "password.showPassword": "비밀번호 표시",
    "password.hidePassword": "비밀번호 숨기기",
    "password.unlock": "잠금 해제",

    // Print dialog
    "print.title": "인쇄",
    "print.pagesLabel": "페이지",
    "print.allPages": "모든 페이지",
    "print.currentPage": "현재 페이지 ({page})",
    "print.pagesRange": "페이지 범위",
    "print.pagesTo": "~",
    "print.custom": "사용자 지정",
    "print.customPlaceholder": "예: 1,3,5-8",
    "print.qualityLabel": "품질",
    "print.qualityDraft": "초안 (150 DPI)",
    "print.qualityStandard": "표준 (300 DPI)",
    "print.qualityHigh": "고품질 (600 DPI)",
    "print.cancel": "취소",
    "print.print": "인쇄",
    "print.errorPageRange": "1부터 {max}까지의 페이지 번호를 입력해 주세요.",
    "print.errorStartEnd": "시작 페이지는 끝 페이지보다 작거나 같아야 합니다.",
    "print.errorCustomRange":
        '잘못된 범위입니다. "1,3,5-8"과 같은 형식으로 입력해 주세요. 페이지 번호는 1부터 {max} 사이여야 합니다.',

    // Loading overlay
    "loading.connecting": "연결 중...",
    "loading.loading": "로딩 중...",
    "loading.processing": "문서 처리 중...",
    "loading.preparingPrint": "인쇄 준비 중...",
    "loading.renderingPage": "{total}페이지 중 {current}페이지 렌더링 중...",
    "loading.progressSize": "{loaded} / {total} MB ({percent}%)",
    "loading.progressLoaded": "{loaded} MB 로딩됨...",

    // View mode menu
    "viewMode.label": "보기 설정",
    "viewMode.scroll": "스크롤",
    "viewMode.layout": "레이아웃",
    "viewMode.rotation": "회전",
    "viewMode.spacing": "간격",
    "viewMode.spread": "펼침",
    "viewMode.continuous": "연속",
    "viewMode.single": "단일",
    "viewMode.double": "양면",
    "viewMode.coverRight": "표지 오른쪽",
    "viewMode.coverLeft": "표지 왼쪽",
    "viewMode.spacingAll": "전체",
    "viewMode.spacingNone": "없음",
    "viewMode.spacingSpread": "펼침",
    "viewMode.spacingPage": "페이지",

    // Annotation panel
    "annotations.comments": "댓글",
    "annotations.noComments": "이 문서에 댓글이 없습니다",
    "annotations.loading": "댓글 로딩 중...",
    "annotations.replyCount": "답글 {count}개",
    "annotations.replyCountSingle": "답글 1개",
    "annotations.showReplies": "답글 표시",
    "annotations.hideReplies": "답글 숨기기",
    "annotations.pageHeader": "{page}페이지",

    // Outline panel
    "outline.label": "문서 개요",
    "outline.loading": "개요 로딩 중...",
    "outline.empty": "이 문서에 개요가 없습니다",

    // Bookmarks panel
    "bookmarks.empty": "이 문서에 북마크가 없습니다",

    // Layers panel
    "layers.loading": "레이어 로딩 중...",
    "layers.empty": "이 문서에 레이어가 없습니다",

    // Attachments panel
    "attachments.empty": "이 문서에 첨부 파일이 없습니다",
    "layers.visibility": "{name} 레이어 표시 전환",

    // Fonts panel
    "fonts.loading": "글꼴 로딩 중...",
    "fonts.empty": "글꼴 사용 데이터가 없습니다",

    // Thumbnail panel
    "thumbnails.label": "페이지 미리보기",
    "thumbnails.pageLabel": "{page}페이지",

    // Spread and viewport
    "spread.pageLabel": "{page}페이지",
    "spread.pageContent": "{page}페이지 콘텐츠",
    "spread.rendering": "렌더링 중...",
    "viewport.documentContent": "문서 콘텐츠",

    // Left panel tabs
    "leftPanel.tabs": "패널 탭",
    "leftPanel.thumbnails": "미리보기",
    "leftPanel.outline": "개요",
    "leftPanel.bookmarks": "북마크",
    "leftPanel.layers": "레이어",
    "leftPanel.attachments": "첨부 파일",
    "leftPanel.fonts": "글꼴",
    "leftPanel.resizeHandle": "사이드 패널 크기 조절",

    // Right panel
    "rightPanel.searchPanel": "검색 패널",
    "rightPanel.commentsPanel": "댓글 패널",
    "rightPanel.resizeHandle": "패널 크기 조절",
};
