<?php
/**
 * [udoc-viewer] shortcode handler.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class UDoc_Shortcode {

	public static function init() {
		add_shortcode( 'udoc-viewer', array( __CLASS__, 'render' ) );
	}

	/**
	 * Render the shortcode.
	 *
	 * @param array  $atts    Shortcode attributes.
	 * @param string $content Shortcode content (unused).
	 * @return string HTML output.
	 */
	public static function render( $atts, $content = null ) {
		$atts = shortcode_atts( array(
			'src'              => '',
			'width'            => '100%',
			'height'           => '600px',
			'theme'            => get_option( 'udoc_default_theme', 'light' ),
			'toolbar'          => get_option( 'udoc_default_hide_toolbar', false ) ? 'false' : 'true',
			'floating-toolbar' => get_option( 'udoc_default_hide_floating_toolbar', false ) ? 'false' : 'true',
			'attribution'      => get_option( 'udoc_default_hide_attribution', false ) ? 'false' : 'true',
			'search'           => 'true',
			'fullscreen'       => 'true',
			'download'         => get_option( 'udoc_default_disable_download', false ) ? 'false' : 'true',
			'print'            => get_option( 'udoc_default_disable_print', false ) ? 'false' : 'true',
			'text-selection'   => 'true',
			'theme-switching'  => get_option( 'udoc_default_disable_theme_switching', false ) ? 'false' : 'true',
			'left-panel'       => 'true',
			'right-panel'      => 'true',
			'thumbnails'       => 'true',
			'outline'          => 'true',
			'bookmarks'        => 'true',
			'layers'           => 'true',
			'attachments'      => 'true',
			'comments'         => 'true',
			'google-fonts'     => get_option( 'udoc_default_google_fonts', true ) ? 'true' : 'false',
			'scroll-mode'      => '',
			'layout-mode'      => '',
			'zoom-mode'        => '',
			'zoom'             => '',
		), $atts, 'udoc-viewer' );

		if ( empty( $atts['src'] ) ) {
			return '<!-- UDoc Viewer: missing "src" attribute -->';
		}

		// Resolve attachment IDs to URLs.
		$src = $atts['src'];
		if ( is_numeric( $src ) ) {
			$url = wp_get_attachment_url( (int) $src );
			if ( $url ) {
				$src = $url;
			} else {
				return '<!-- UDoc Viewer: attachment ID ' . esc_html( $src ) . ' not found -->';
			}
		}

		// Build viewer config JSON.
		$config = array(
			'src' => $src,
		);

		if ( $atts['theme'] !== 'light' ) {
			$config['theme'] = $atts['theme'];
		}

		if ( self::is_false( $atts['toolbar'] ) ) {
			$config['hideToolbar'] = true;
		}

		if ( self::is_false( $atts['floating-toolbar'] ) ) {
			$config['hideFloatingToolbar'] = true;
		}

		if ( self::is_false( $atts['attribution'] ) ) {
			$config['hideAttribution'] = true;
		}

		if ( self::is_false( $atts['search'] ) ) {
			$config['disableSearch'] = true;
		}

		if ( self::is_false( $atts['fullscreen'] ) ) {
			$config['disableFullscreen'] = true;
		}

		if ( self::is_false( $atts['download'] ) ) {
			$config['disableDownload'] = true;
		}

		if ( self::is_false( $atts['print'] ) ) {
			$config['disablePrint'] = true;
		}

		if ( self::is_false( $atts['text-selection'] ) ) {
			$config['disableTextSelection'] = true;
		}

		if ( self::is_false( $atts['theme-switching'] ) ) {
			$config['disableThemeSwitching'] = true;
		}

		if ( self::is_false( $atts['left-panel'] ) ) {
			$config['disableLeftPanel'] = true;
		}

		if ( self::is_false( $atts['right-panel'] ) ) {
			$config['disableRightPanel'] = true;
		}

		if ( self::is_false( $atts['thumbnails'] ) ) {
			$config['disableThumbnails'] = true;
		}

		if ( self::is_false( $atts['outline'] ) ) {
			$config['disableOutline'] = true;
		}

		if ( self::is_false( $atts['bookmarks'] ) ) {
			$config['disableBookmarks'] = true;
		}

		if ( self::is_false( $atts['layers'] ) ) {
			$config['disableLayers'] = true;
		}

		if ( self::is_false( $atts['attachments'] ) ) {
			$config['disableAttachments'] = true;
		}

		if ( self::is_false( $atts['comments'] ) ) {
			$config['disableComments'] = true;
		}

		if ( self::is_false( $atts['google-fonts'] ) ) {
			$config['googleFonts'] = false;
		}

		if ( ! empty( $atts['scroll-mode'] ) ) {
			$config['scrollMode'] = $atts['scroll-mode'];
		}

		if ( ! empty( $atts['layout-mode'] ) ) {
			$config['layoutMode'] = $atts['layout-mode'];
		}

		if ( ! empty( $atts['zoom-mode'] ) ) {
			$config['zoomMode'] = $atts['zoom-mode'];
		}

		if ( ! empty( $atts['zoom'] ) ) {
			$config['zoom'] = (float) $atts['zoom'];
		}

		// Trigger asset enqueue.
		UDoc_Assets::enqueue();

		$id          = 'udoc-viewer-' . wp_unique_id();
		$config_json = wp_json_encode( $config );
		$width       = esc_attr( $atts['width'] );
		$height      = esc_attr( $atts['height'] );

		return sprintf(
			'<div id="%s" class="udoc-viewer-container" style="width:%s;height:%s;" data-udoc-config="%s"></div>',
			esc_attr( $id ),
			$width,
			$height,
			esc_attr( $config_json )
		);
	}

	/**
	 * Check if a shortcode attribute value is falsy.
	 *
	 * @param string $value Attribute value.
	 * @return bool
	 */
	private static function is_false( $value ) {
		return in_array( strtolower( $value ), array( 'false', 'no', '0', 'off' ), true );
	}
}
