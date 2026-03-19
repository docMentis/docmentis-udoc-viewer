<?php
/**
 * Plugin Name:       UDoc Viewer
 * Plugin URI:        https://www.docmentis.com
 * Description:       Universal document viewer for WordPress — embed PDF, DOCX, PPTX, and images with high-fidelity rendering powered by WebAssembly.
 * Version:           0.1.0
 * Requires at least: 6.0
 * Requires PHP:      7.4
 * Author:            docMentis
 * Author URI:        https://www.docmentis.com
 * License:           GPL-2.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       udoc-viewer
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'UDOC_VIEWER_VERSION', '0.1.0' );
define( 'UDOC_VIEWER_SDK_VERSION', '0.6.6' );
define( 'UDOC_VIEWER_PATH', plugin_dir_path( __FILE__ ) );
define( 'UDOC_VIEWER_URL', plugin_dir_url( __FILE__ ) );

require_once UDOC_VIEWER_PATH . 'includes/class-udoc-assets.php';
require_once UDOC_VIEWER_PATH . 'includes/class-udoc-settings.php';
require_once UDOC_VIEWER_PATH . 'includes/class-udoc-shortcode.php';
require_once UDOC_VIEWER_PATH . 'includes/class-udoc-block.php';

/**
 * Initialize the plugin.
 */
function udoc_viewer_init() {
	UDoc_Assets::init();
	UDoc_Settings::init();
	UDoc_Shortcode::init();
	UDoc_Block::init();
}
add_action( 'plugins_loaded', 'udoc_viewer_init' );

/**
 * Set default options on activation.
 */
function udoc_viewer_activate() {
	add_option( 'udoc_license_key', '' );
	add_option( 'udoc_asset_mode', 'cdn' );
	add_option( 'udoc_base_url', '' );
	add_option( 'udoc_default_theme', 'light' );
	add_option( 'udoc_default_hide_toolbar', false );
	add_option( 'udoc_default_hide_attribution', false );
	add_option( 'udoc_gpu_enabled', false );
}
register_activation_hook( __FILE__, 'udoc_viewer_activate' );

/**
 * Clean up options on uninstall.
 */
function udoc_viewer_uninstall() {
	delete_option( 'udoc_license_key' );
	delete_option( 'udoc_asset_mode' );
	delete_option( 'udoc_base_url' );
	delete_option( 'udoc_default_theme' );
	delete_option( 'udoc_default_hide_toolbar' );
	delete_option( 'udoc_default_hide_attribution' );
	delete_option( 'udoc_gpu_enabled' );
}
register_uninstall_hook( __FILE__, 'udoc_viewer_uninstall' );
