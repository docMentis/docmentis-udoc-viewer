<?php
/**
 * Asset enqueue and WASM MIME type handling.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class UDoc_Assets {

	/**
	 * Whether a viewer instance exists on the current page.
	 *
	 * @var bool
	 */
	private static $has_viewer = false;

	public static function init() {
		add_action( 'wp_enqueue_scripts', array( __CLASS__, 'register_scripts' ) );
		add_filter( 'upload_mimes', array( __CLASS__, 'add_wasm_mime_type' ) );
		add_filter( 'wp_check_filetype_and_ext', array( __CLASS__, 'fix_wasm_filetype' ), 10, 5 );
		add_filter( 'script_loader_tag', array( __CLASS__, 'add_module_type' ), 10, 3 );
	}

	/**
	 * Flag that a viewer instance is present and enqueue scripts.
	 */
	public static function enqueue() {
		self::$has_viewer = true;
		wp_enqueue_script( 'udoc-viewer-init' );
	}

	/**
	 * Register scripts (but don't enqueue — shortcode/block triggers enqueue).
	 */
	public static function register_scripts() {
		wp_register_script(
			'udoc-viewer-init',
			UDOC_VIEWER_URL . 'assets/js/udoc-viewer-init.js',
			array(),
			UDOC_VIEWER_VERSION,
			array( 'in_footer' => true )
		);

		$esm_url  = self::get_esm_url();
		$base_url = self::get_base_url();

		$config = array(
			'esmUrl'  => $esm_url,
			'license' => get_option( 'udoc_license_key', '' ),
			'gpu'     => (bool) get_option( 'udoc_gpu_enabled', false ),
			'theme'   => get_option( 'udoc_default_theme', 'light' ),
		);

		// Only pass baseUrl in self-hosted mode. In CDN mode, the SDK uses its
		// inline blob worker and built-in CDN fallback for WASM — passing a
		// cross-origin baseUrl would cause Worker creation to fail.
		if ( 'self-hosted' === get_option( 'udoc_asset_mode', 'cdn' ) ) {
			$config['baseUrl'] = $base_url;
		}

		wp_localize_script( 'udoc-viewer-init', 'udocViewerConfig', $config );
	}

	/**
	 * Get the ESM entry point URL.
	 *
	 * @return string
	 */
	private static function get_esm_url() {
		$mode = get_option( 'udoc_asset_mode', 'cdn' );

		if ( 'self-hosted' === $mode ) {
			$base = get_option( 'udoc_base_url', '' );
			return trailingslashit( $base ) . 'index.js';
		}

		$version = UDOC_VIEWER_SDK_VERSION;
		// Use jsDelivr's +esm endpoint which bundles all ESM imports into a single
		// browser-ready module (raw dist files have extensionless imports that browsers can't resolve).
		return "https://cdn.jsdelivr.net/npm/@docmentis/udoc-viewer@{$version}/+esm";
	}

	/**
	 * Get the base URL for WASM and worker files.
	 *
	 * @return string
	 */
	private static function get_base_url() {
		$mode = get_option( 'udoc_asset_mode', 'cdn' );

		if ( 'self-hosted' === $mode ) {
			return get_option( 'udoc_base_url', '' );
		}

		$version = UDOC_VIEWER_SDK_VERSION;
		return "https://cdn.jsdelivr.net/npm/@docmentis/udoc-viewer@{$version}/dist/src";
	}

	/**
	 * Allow .wasm file uploads in Media Library.
	 *
	 * @param array $mimes Allowed MIME types.
	 * @return array
	 */
	public static function add_wasm_mime_type( $mimes ) {
		$mimes['wasm'] = 'application/wasm';
		return $mimes;
	}

	/**
	 * Fix WASM file type detection.
	 *
	 * @param array  $data     File data.
	 * @param string $file     Full path to the file.
	 * @param string $filename The name of the file.
	 * @param array  $mimes    Allowed MIME types.
	 * @param string $real_mime Real MIME type.
	 * @return array
	 */
	public static function fix_wasm_filetype( $data, $file, $filename, $mimes = null, $real_mime = null ) {
		if ( str_ends_with( $filename, '.wasm' ) ) {
			$data['ext']  = 'wasm';
			$data['type'] = 'application/wasm';
		}
		return $data;
	}

	/**
	 * Add type="module" to the init script tag so dynamic import() works.
	 *
	 * @param string $tag    The script tag HTML.
	 * @param string $handle The script handle.
	 * @param string $src    The script source URL.
	 * @return string
	 */
	public static function add_module_type( $tag, $handle, $src ) {
		if ( 'udoc-viewer-init' === $handle ) {
			$tag = str_replace( '<script ', '<script type="module" ', $tag );
			// Prevent caching plugins from combining/deferring this script.
			$tag = str_replace( '<script ', '<script data-no-optimize="1" data-no-minify="1" ', $tag );
		}
		return $tag;
	}
}
