<?php
/**
 * Gutenberg block registration.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class UDoc_Block {

	public static function init() {
		add_action( 'init', array( __CLASS__, 'register_block' ) );
	}

	/**
	 * Register the udoc/viewer block.
	 */
	public static function register_block() {
		if ( ! function_exists( 'register_block_type' ) ) {
			return;
		}

		register_block_type( UDOC_VIEWER_PATH . 'block', array(
			'render_callback' => array( __CLASS__, 'render_block' ),
		) );
	}

	/**
	 * Server-side render callback for the block.
	 * Reuses the shortcode rendering logic.
	 *
	 * @param array $attributes Block attributes.
	 * @return string HTML output.
	 */
	public static function render_block( $attributes ) {
		$atts = array(
			'src'              => '',
			'width'            => '100%',
			'height'           => '600px',
			'theme'            => get_option( 'udoc_default_theme', 'light' ),
			'toolbar'          => 'true',
			'floating-toolbar' => 'true',
			'attribution'      => 'true',
			'search'           => 'true',
			'fullscreen'       => 'true',
			'download'         => 'true',
			'print'            => 'true',
			'text-selection'   => 'true',
			'theme-switching'  => 'true',
			'left-panel'       => 'true',
			'right-panel'      => 'true',
			'thumbnails'       => 'true',
			'outline'          => 'true',
			'bookmarks'        => 'true',
			'layers'           => 'true',
			'attachments'      => 'true',
			'comments'         => 'true',
			'google-fonts'     => 'true',
			'scroll-mode'      => '',
			'layout-mode'      => '',
			'zoom-mode'        => '',
			'zoom'             => '',
		);

		// Map block attributes to shortcode format.
		if ( ! empty( $attributes['attachmentId'] ) ) {
			$atts['src'] = (string) $attributes['attachmentId'];
		} elseif ( ! empty( $attributes['src'] ) ) {
			$atts['src'] = $attributes['src'];
		}

		if ( ! empty( $attributes['width'] ) ) {
			$atts['width'] = $attributes['width'];
		}

		if ( ! empty( $attributes['height'] ) ) {
			$atts['height'] = $attributes['height'];
		}

		if ( ! empty( $attributes['theme'] ) ) {
			$atts['theme'] = $attributes['theme'];
		}

		if ( ! empty( $attributes['hideToolbar'] ) ) {
			$atts['toolbar'] = 'false';
		}

		if ( ! empty( $attributes['hideFloatingToolbar'] ) ) {
			$atts['floating-toolbar'] = 'false';
		}

		if ( ! empty( $attributes['hideAttribution'] ) ) {
			$atts['attribution'] = 'false';
		}

		if ( ! empty( $attributes['disableSearch'] ) ) {
			$atts['search'] = 'false';
		}

		if ( ! empty( $attributes['disableFullscreen'] ) ) {
			$atts['fullscreen'] = 'false';
		}

		if ( ! empty( $attributes['disableDownload'] ) ) {
			$atts['download'] = 'false';
		}

		if ( ! empty( $attributes['disablePrint'] ) ) {
			$atts['print'] = 'false';
		}

		if ( ! empty( $attributes['disableTextSelection'] ) ) {
			$atts['text-selection'] = 'false';
		}

		if ( ! empty( $attributes['disableThemeSwitching'] ) ) {
			$atts['theme-switching'] = 'false';
		}

		if ( ! empty( $attributes['disableLeftPanel'] ) ) {
			$atts['left-panel'] = 'false';
		}

		if ( ! empty( $attributes['disableRightPanel'] ) ) {
			$atts['right-panel'] = 'false';
		}

		if ( ! empty( $attributes['disableThumbnails'] ) ) {
			$atts['thumbnails'] = 'false';
		}

		if ( ! empty( $attributes['disableOutline'] ) ) {
			$atts['outline'] = 'false';
		}

		if ( ! empty( $attributes['disableBookmarks'] ) ) {
			$atts['bookmarks'] = 'false';
		}

		if ( ! empty( $attributes['disableLayers'] ) ) {
			$atts['layers'] = 'false';
		}

		if ( ! empty( $attributes['disableAttachments'] ) ) {
			$atts['attachments'] = 'false';
		}

		if ( ! empty( $attributes['disableComments'] ) ) {
			$atts['comments'] = 'false';
		}

		if ( isset( $attributes['googleFonts'] ) && ! $attributes['googleFonts'] ) {
			$atts['google-fonts'] = 'false';
		}

		if ( ! empty( $attributes['scrollMode'] ) ) {
			$atts['scroll-mode'] = $attributes['scrollMode'];
		}

		if ( ! empty( $attributes['layoutMode'] ) ) {
			$atts['layout-mode'] = $attributes['layoutMode'];
		}

		if ( ! empty( $attributes['zoomMode'] ) ) {
			$atts['zoom-mode'] = $attributes['zoomMode'];
		}

		if ( ! empty( $attributes['zoom'] ) ) {
			$atts['zoom'] = $attributes['zoom'];
		}

		return UDoc_Shortcode::render( $atts );
	}
}
