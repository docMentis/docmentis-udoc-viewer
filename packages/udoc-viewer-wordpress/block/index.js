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
            hideAttribution,
            disableSearch,
            disableFullscreen,
            disableTextSelection,
            disableLeftPanel,
            disableRightPanel,
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
                    label: __("Hide Attribution", "udoc-viewer"),
                    checked: hideAttribution,
                    onChange: (val) => setAttributes({ hideAttribution: val }),
                    help: __("Requires a valid license key.", "udoc-viewer"),
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
                    label: __("Disable Text Selection", "udoc-viewer"),
                    checked: disableTextSelection,
                    onChange: (val) => setAttributes({ disableTextSelection: val }),
                }),
                wp.element.createElement(ToggleControl, {
                    label: __("Disable Left Panel", "udoc-viewer"),
                    checked: disableLeftPanel,
                    onChange: (val) => setAttributes({ disableLeftPanel: val }),
                    help: __("Thumbnails, outline, bookmarks, layers, attachments", "udoc-viewer"),
                }),
                wp.element.createElement(ToggleControl, {
                    label: __("Disable Right Panel", "udoc-viewer"),
                    checked: disableRightPanel,
                    onChange: (val) => setAttributes({ disableRightPanel: val }),
                    help: __("Search, comments", "udoc-viewer"),
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
