/**
 * UDoc Viewer — Gutenberg block editor component.
 *
 * Built with vanilla wp.* globals (no JSX build step needed for v1).
 */

/* global wp */

const { registerBlockType } = wp.blocks;
const { useBlockProps, MediaUpload, MediaUploadCheck, InspectorControls } = wp.blockEditor;
const { Placeholder, Button, TextControl, ToggleControl, SelectControl, PanelBody, Icon } = wp.components;
const { __ } = wp.i18n;

const ALLOWED_MEDIA_TYPES = [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "image/png",
    "image/jpeg",
    "image/gif",
    "image/webp",
];

registerBlockType("udoc/viewer", {
    edit: function EditUDocViewer({ attributes, setAttributes }) {
        const blockProps = useBlockProps();
        const {
            src,
            attachmentId,
            attachmentTitle,
            width,
            height,
            theme,
            hideToolbar,
            hideFloatingToolbar,
            hideAttribution,
            disableSearch,
            disableFullscreen,
            disableDownload,
            disablePrint,
            disableTextSelection,
            disableThemeSwitching,
            disableLeftPanel,
            disableRightPanel,
            disableThumbnails,
            disableOutline,
            disableBookmarks,
            disableLayers,
            disableAttachments,
            disableComments,
            googleFonts,
            scrollMode,
            layoutMode,
            zoomMode,
            zoom,
        } = attributes;

        const hasDocument = attachmentId > 0 || (src && src.length > 0);

        const onSelectMedia = (media) => {
            setAttributes({
                attachmentId: media.id,
                attachmentTitle: media.title || media.filename,
                src: "",
            });
        };

        const onRemoveMedia = () => {
            setAttributes({
                attachmentId: 0,
                attachmentTitle: "",
                src: "",
            });
        };

        // Sidebar inspector controls.
        const inspectorControls = wp.element.createElement(
            InspectorControls,
            null,
            wp.element.createElement(
                PanelBody,
                { title: __("Dimensions", "udoc-viewer") },
                wp.element.createElement(TextControl, {
                    label: __("Width", "udoc-viewer"),
                    value: width,
                    onChange: (val) => setAttributes({ width: val }),
                    help: __("CSS value, e.g. 100%, 800px", "udoc-viewer"),
                }),
                wp.element.createElement(TextControl, {
                    label: __("Height", "udoc-viewer"),
                    value: height,
                    onChange: (val) => setAttributes({ height: val }),
                    help: __("CSS value, e.g. 600px, 80vh", "udoc-viewer"),
                }),
            ),
            wp.element.createElement(
                PanelBody,
                {
                    title: __("Appearance", "udoc-viewer"),
                    initialOpen: false,
                },
                wp.element.createElement(SelectControl, {
                    label: __("Theme", "udoc-viewer"),
                    value: theme,
                    options: [
                        {
                            label: __("Default (from settings)", "udoc-viewer"),
                            value: "",
                        },
                        { label: __("Light", "udoc-viewer"), value: "light" },
                        { label: __("Dark", "udoc-viewer"), value: "dark" },
                        {
                            label: __("System", "udoc-viewer"),
                            value: "system",
                        },
                    ],
                    onChange: (val) => setAttributes({ theme: val }),
                }),
                wp.element.createElement(ToggleControl, {
                    label: __("Hide Toolbar", "udoc-viewer"),
                    checked: hideToolbar,
                    onChange: (val) => setAttributes({ hideToolbar: val }),
                }),
                wp.element.createElement(ToggleControl, {
                    label: __("Hide Floating Toolbar", "udoc-viewer"),
                    checked: hideFloatingToolbar,
                    onChange: (val) => setAttributes({ hideFloatingToolbar: val }),
                    help: __("Page navigation, zoom, and view mode controls.", "udoc-viewer"),
                }),
                wp.element.createElement(ToggleControl, {
                    label: __("Hide Attribution", "udoc-viewer"),
                    checked: hideAttribution,
                    onChange: (val) => setAttributes({ hideAttribution: val }),
                    help: __("Requires a valid license key.", "udoc-viewer"),
                }),
                wp.element.createElement(ToggleControl, {
                    label: __("Disable Theme Switching", "udoc-viewer"),
                    checked: disableThemeSwitching,
                    onChange: (val) => setAttributes({ disableThemeSwitching: val }),
                }),
            ),
            wp.element.createElement(
                PanelBody,
                {
                    title: __("Features", "udoc-viewer"),
                    initialOpen: false,
                },
                wp.element.createElement(ToggleControl, {
                    label: __("Disable Search", "udoc-viewer"),
                    checked: disableSearch,
                    onChange: (val) => setAttributes({ disableSearch: val }),
                }),
                wp.element.createElement(ToggleControl, {
                    label: __("Disable Fullscreen", "udoc-viewer"),
                    checked: disableFullscreen,
                    onChange: (val) => setAttributes({ disableFullscreen: val }),
                }),
                wp.element.createElement(ToggleControl, {
                    label: __("Disable Download", "udoc-viewer"),
                    checked: disableDownload,
                    onChange: (val) => setAttributes({ disableDownload: val }),
                }),
                wp.element.createElement(ToggleControl, {
                    label: __("Disable Print", "udoc-viewer"),
                    checked: disablePrint,
                    onChange: (val) => setAttributes({ disablePrint: val }),
                }),
                wp.element.createElement(ToggleControl, {
                    label: __("Disable Text Selection", "udoc-viewer"),
                    checked: disableTextSelection,
                    onChange: (val) => setAttributes({ disableTextSelection: val }),
                }),
                wp.element.createElement(ToggleControl, {
                    label: __("Google Fonts", "udoc-viewer"),
                    checked: googleFonts,
                    onChange: (val) => setAttributes({ googleFonts: val }),
                    help: __("Fetch missing fonts from Google Fonts. Disable for privacy.", "udoc-viewer"),
                }),
            ),
            wp.element.createElement(
                PanelBody,
                {
                    title: __("Panels", "udoc-viewer"),
                    initialOpen: false,
                },
                wp.element.createElement(ToggleControl, {
                    label: __("Disable Left Panel", "udoc-viewer"),
                    checked: disableLeftPanel,
                    onChange: (val) => setAttributes({ disableLeftPanel: val }),
                    help: __("Hides the entire left panel area.", "udoc-viewer"),
                }),
                wp.element.createElement(ToggleControl, {
                    label: __("Disable Right Panel", "udoc-viewer"),
                    checked: disableRightPanel,
                    onChange: (val) => setAttributes({ disableRightPanel: val }),
                    help: __("Hides the entire right panel area.", "udoc-viewer"),
                }),
                wp.element.createElement(ToggleControl, {
                    label: __("Disable Thumbnails", "udoc-viewer"),
                    checked: disableThumbnails,
                    onChange: (val) => setAttributes({ disableThumbnails: val }),
                }),
                wp.element.createElement(ToggleControl, {
                    label: __("Disable Outline", "udoc-viewer"),
                    checked: disableOutline,
                    onChange: (val) => setAttributes({ disableOutline: val }),
                }),
                wp.element.createElement(ToggleControl, {
                    label: __("Disable Bookmarks", "udoc-viewer"),
                    checked: disableBookmarks,
                    onChange: (val) => setAttributes({ disableBookmarks: val }),
                }),
                wp.element.createElement(ToggleControl, {
                    label: __("Disable Layers", "udoc-viewer"),
                    checked: disableLayers,
                    onChange: (val) => setAttributes({ disableLayers: val }),
                }),
                wp.element.createElement(ToggleControl, {
                    label: __("Disable Attachments", "udoc-viewer"),
                    checked: disableAttachments,
                    onChange: (val) => setAttributes({ disableAttachments: val }),
                }),
                wp.element.createElement(ToggleControl, {
                    label: __("Disable Comments", "udoc-viewer"),
                    checked: disableComments,
                    onChange: (val) => setAttributes({ disableComments: val }),
                }),
            ),
            wp.element.createElement(
                PanelBody,
                {
                    title: __("View Mode", "udoc-viewer"),
                    initialOpen: false,
                },
                wp.element.createElement(SelectControl, {
                    label: __("Scroll Mode", "udoc-viewer"),
                    value: scrollMode,
                    options: [
                        { label: __("Default", "udoc-viewer"), value: "" },
                        { label: __("Continuous", "udoc-viewer"), value: "continuous" },
                        { label: __("Page", "udoc-viewer"), value: "page" },
                        { label: __("Wrapped", "udoc-viewer"), value: "wrapped" },
                    ],
                    onChange: (val) => setAttributes({ scrollMode: val }),
                }),
                wp.element.createElement(SelectControl, {
                    label: __("Layout Mode", "udoc-viewer"),
                    value: layoutMode,
                    options: [
                        { label: __("Default", "udoc-viewer"), value: "" },
                        { label: __("Single Page", "udoc-viewer"), value: "single" },
                        { label: __("Double Page", "udoc-viewer"), value: "double" },
                        { label: __("Double Page (Cover)", "udoc-viewer"), value: "double-cover" },
                    ],
                    onChange: (val) => setAttributes({ layoutMode: val }),
                }),
                wp.element.createElement(SelectControl, {
                    label: __("Zoom Mode", "udoc-viewer"),
                    value: zoomMode,
                    options: [
                        { label: __("Default", "udoc-viewer"), value: "" },
                        { label: __("Fit Width", "udoc-viewer"), value: "fit-width" },
                        { label: __("Fit Page", "udoc-viewer"), value: "fit-page" },
                        { label: __("Fit Spread Width", "udoc-viewer"), value: "fit-spread-width" },
                        { label: __("Custom", "udoc-viewer"), value: "custom" },
                    ],
                    onChange: (val) => setAttributes({ zoomMode: val }),
                }),
                wp.element.createElement(TextControl, {
                    label: __("Zoom Level", "udoc-viewer"),
                    value: zoom,
                    onChange: (val) => setAttributes({ zoom: val }),
                    help: __("Number, e.g. 1.5. Only used when Zoom Mode is Custom.", "udoc-viewer"),
                }),
            ),
        );

        // Main block content.
        if (!hasDocument) {
            // No document selected — show placeholder.
            return wp.element.createElement(
                "div",
                blockProps,
                inspectorControls,
                wp.element.createElement(
                    Placeholder,
                    {
                        icon: "media-document",
                        label: __("Document Viewer", "udoc-viewer"),
                        instructions: __("Select a document from the Media Library or enter a URL.", "udoc-viewer"),
                    },
                    wp.element.createElement(
                        "div",
                        {
                            style: {
                                display: "flex",
                                flexDirection: "column",
                                gap: "12px",
                                width: "100%",
                            },
                        },
                        wp.element.createElement(
                            MediaUploadCheck,
                            null,
                            wp.element.createElement(MediaUpload, {
                                onSelect: onSelectMedia,
                                allowedTypes: ALLOWED_MEDIA_TYPES,
                                render: ({ open }) =>
                                    wp.element.createElement(
                                        Button,
                                        {
                                            variant: "primary",
                                            onClick: open,
                                        },
                                        __("Choose from Media Library", "udoc-viewer"),
                                    ),
                            }),
                        ),
                        wp.element.createElement(TextControl, {
                            label: __("Or enter a document URL", "udoc-viewer"),
                            value: src || "",
                            onChange: (val) =>
                                setAttributes({
                                    src: val,
                                    attachmentId: 0,
                                    attachmentTitle: "",
                                }),
                            placeholder: "https://example.com/document.pdf",
                        }),
                    ),
                ),
            );
        }

        // Document selected — show preview card.
        const displayName = attachmentTitle || src || __("Document", "udoc-viewer");

        return wp.element.createElement(
            "div",
            blockProps,
            inspectorControls,
            wp.element.createElement(
                "div",
                {
                    style: {
                        border: "1px solid #ddd",
                        borderRadius: "4px",
                        padding: "16px",
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        backgroundColor: "#f9f9f9",
                    },
                },
                wp.element.createElement(Icon, {
                    icon: "media-document",
                    size: 36,
                }),
                wp.element.createElement(
                    "div",
                    { style: { flex: 1 } },
                    wp.element.createElement("strong", null, __("Document Viewer", "udoc-viewer")),
                    wp.element.createElement(
                        "div",
                        {
                            style: {
                                fontSize: "13px",
                                color: "#666",
                                marginTop: "4px",
                            },
                        },
                        displayName,
                    ),
                ),
                wp.element.createElement(
                    Button,
                    {
                        variant: "secondary",
                        isDestructive: true,
                        onClick: onRemoveMedia,
                        size: "small",
                    },
                    __("Remove", "udoc-viewer"),
                ),
            ),
        );
    },

    // Dynamic rendering via PHP — no save markup needed.
    save: function () {
        return null;
    },
});
