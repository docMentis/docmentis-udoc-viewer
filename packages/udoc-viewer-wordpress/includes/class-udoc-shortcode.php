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
			'src'            => '',
			'width'          => '100%',
			'height'         => '600px',
			'theme'          => get_option( 'udoc_default_theme', 'light' ),
			'toolbar'        => get_option( 'udoc_default_hide_toolbar', false ) ? 'false' : 'true',
			'attribution'    => get_option( 'udoc_default_hide_attribution', false ) ? 'false' : 'true',
			'search'         => 'true',
			'fullscreen'     => 'true',
			'text-selection' => 'true',
			'left-panel'     => 'true',
			'right-panel'    => 'true',
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

		if ( self::is_false( $atts['attribution'] ) ) {
			$config['hideAttribution'] = true;
		}

		if ( self::is_false( $atts['search'] ) ) {
			$config['disableSearch'] = true;
		}

		if ( self::is_false( $atts['fullscreen'] ) ) {
			$config['disableFullscreen'] = true;
		}

		if ( self::is_false( $atts['text-selection'] ) ) {
			$config['disableTextSelection'] = true;
		}

		if ( self::is_false( $atts['left-panel'] ) ) {
			$config['disableLeftPanel'] = true;
		}

		if ( self::is_false( $atts['right-panel'] ) ) {
			$config['disableRightPanel'] = true;
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
