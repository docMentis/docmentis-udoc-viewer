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
			'src'            => '',
			'width'          => '100%',
			'height'         => '600px',
			'theme'          => get_option( 'udoc_default_theme', 'light' ),
			'toolbar'        => 'true',
			'attribution'    => 'true',
			'search'         => 'true',
			'fullscreen'     => 'true',
			'text-selection' => 'true',
			'left-panel'     => 'true',
			'right-panel'    => 'true',
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

		if ( ! empty( $attributes['hideAttribution'] ) ) {
			$atts['attribution'] = 'false';
		}

		if ( ! empty( $attributes['disableSearch'] ) ) {
			$atts['search'] = 'false';
		}

		if ( ! empty( $attributes['disableFullscreen'] ) ) {
			$atts['fullscreen'] = 'false';
		}

		if ( ! empty( $attributes['disableTextSelection'] ) ) {
			$atts['text-selection'] = 'false';
		}

		if ( ! empty( $attributes['disableLeftPanel'] ) ) {
			$atts['left-panel'] = 'false';
		}

		if ( ! empty( $attributes['disableRightPanel'] ) ) {
			$atts['right-panel'] = 'false';
		}

		return UDoc_Shortcode::render( $atts );
	}
}
