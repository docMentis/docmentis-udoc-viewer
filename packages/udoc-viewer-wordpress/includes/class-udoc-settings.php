<?php
/**
 * Settings page under Settings > UDoc Viewer.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class UDoc_Settings {

	public static function init() {
		add_action( 'admin_menu', array( __CLASS__, 'add_menu' ) );
		add_action( 'admin_init', array( __CLASS__, 'register_settings' ) );
	}

	/**
	 * Add settings page to the admin menu.
	 */
	public static function add_menu() {
		add_options_page(
			__( 'UDoc Viewer Settings', 'udoc-viewer' ),
			__( 'UDoc Viewer', 'udoc-viewer' ),
			'manage_options',
			'udoc-viewer',
			array( __CLASS__, 'render_page' )
		);
	}

	/**
	 * Register all settings fields.
	 */
	public static function register_settings() {
		// License section.
		add_settings_section(
			'udoc_license_section',
			__( 'License', 'udoc-viewer' ),
			function () {
				echo '<p>' . esc_html__( 'Enter your license key to remove the "Powered by docMentis" attribution and unlock premium features.', 'udoc-viewer' ) . '</p>';
			},
			'udoc-viewer'
		);

		register_setting( 'udoc-viewer', 'udoc_license_key', array(
			'type'              => 'string',
			'sanitize_callback' => 'sanitize_text_field',
			'default'           => '',
		) );

		add_settings_field(
			'udoc_license_key',
			__( 'License Key', 'udoc-viewer' ),
			array( __CLASS__, 'render_password_field' ),
			'udoc-viewer',
			'udoc_license_section',
			array( 'name' => 'udoc_license_key' )
		);

		// Asset loading section.
		add_settings_section(
			'udoc_assets_section',
			__( 'Asset Loading', 'udoc-viewer' ),
			function () {
				echo '<p>' . esc_html__( 'Choose how the viewer engine files (JavaScript + WebAssembly) are loaded.', 'udoc-viewer' ) . '</p>';
			},
			'udoc-viewer'
		);

		register_setting( 'udoc-viewer', 'udoc_asset_mode', array(
			'type'              => 'string',
			'sanitize_callback' => function ( $value ) {
				return in_array( $value, array( 'cdn', 'self-hosted' ), true ) ? $value : 'cdn';
			},
			'default'           => 'cdn',
		) );

		add_settings_field(
			'udoc_asset_mode',
			__( 'Loading Mode', 'udoc-viewer' ),
			array( __CLASS__, 'render_asset_mode_field' ),
			'udoc-viewer',
			'udoc_assets_section'
		);

		register_setting( 'udoc-viewer', 'udoc_base_url', array(
			'type'              => 'string',
			'sanitize_callback' => 'esc_url_raw',
			'default'           => '',
		) );

		add_settings_field(
			'udoc_base_url',
			__( 'Self-Hosted Base URL', 'udoc-viewer' ),
			array( __CLASS__, 'render_text_field' ),
			'udoc-viewer',
			'udoc_assets_section',
			array(
				'name'        => 'udoc_base_url',
				'description' => __( 'URL pointing to the directory containing index.js, worker.js, and udoc_bg.wasm. Only used when "Self-Hosted" is selected.', 'udoc-viewer' ),
			)
		);

		// Defaults section.
		add_settings_section(
			'udoc_defaults_section',
			__( 'Viewer Defaults', 'udoc-viewer' ),
			function () {
				echo '<p>' . esc_html__( 'Default settings applied to all viewer instances. Individual shortcodes and blocks can override these.', 'udoc-viewer' ) . '</p>';
			},
			'udoc-viewer'
		);

		register_setting( 'udoc-viewer', 'udoc_default_theme', array(
			'type'              => 'string',
			'sanitize_callback' => function ( $value ) {
				return in_array( $value, array( 'light', 'dark', 'system' ), true ) ? $value : 'light';
			},
			'default'           => 'light',
		) );

		add_settings_field(
			'udoc_default_theme',
			__( 'Theme', 'udoc-viewer' ),
			array( __CLASS__, 'render_select_field' ),
			'udoc-viewer',
			'udoc_defaults_section',
			array(
				'name'    => 'udoc_default_theme',
				'options' => array(
					'light'  => __( 'Light', 'udoc-viewer' ),
					'dark'   => __( 'Dark', 'udoc-viewer' ),
					'system' => __( 'System', 'udoc-viewer' ),
				),
			)
		);

		register_setting( 'udoc-viewer', 'udoc_default_hide_toolbar', array(
			'type'              => 'boolean',
			'sanitize_callback' => 'rest_sanitize_boolean',
			'default'           => false,
		) );

		add_settings_field(
			'udoc_default_hide_toolbar',
			__( 'Hide Toolbar', 'udoc-viewer' ),
			array( __CLASS__, 'render_checkbox_field' ),
			'udoc-viewer',
			'udoc_defaults_section',
			array(
				'name'        => 'udoc_default_hide_toolbar',
				'description' => __( 'Hide the top toolbar by default.', 'udoc-viewer' ),
			)
		);

		register_setting( 'udoc-viewer', 'udoc_default_hide_attribution', array(
			'type'              => 'boolean',
			'sanitize_callback' => 'rest_sanitize_boolean',
			'default'           => false,
		) );

		add_settings_field(
			'udoc_default_hide_attribution',
			__( 'Hide Attribution', 'udoc-viewer' ),
			array( __CLASS__, 'render_checkbox_field' ),
			'udoc-viewer',
			'udoc_defaults_section',
			array(
				'name'        => 'udoc_default_hide_attribution',
				'description' => __( 'Hide "Powered by docMentis" link. Requires a valid license.', 'udoc-viewer' ),
			)
		);

		register_setting( 'udoc-viewer', 'udoc_gpu_enabled', array(
			'type'              => 'boolean',
			'sanitize_callback' => 'rest_sanitize_boolean',
			'default'           => false,
		) );

		add_settings_field(
			'udoc_gpu_enabled',
			__( 'GPU Acceleration', 'udoc-viewer' ),
			array( __CLASS__, 'render_checkbox_field' ),
			'udoc-viewer',
			'udoc_defaults_section',
			array(
				'name'        => 'udoc_gpu_enabled',
				'description' => __( 'Enable WebGPU-accelerated rendering (falls back to CPU if unsupported).', 'udoc-viewer' ),
			)
		);
	}

	/**
	 * Render the settings page.
	 */
	public static function render_page() {
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}
		?>
		<div class="wrap">
			<h1><?php echo esc_html( get_admin_page_title() ); ?></h1>
			<form method="post" action="options.php">
				<?php
				settings_fields( 'udoc-viewer' );
				do_settings_sections( 'udoc-viewer' );
				submit_button();
				?>
			</form>
			<hr>
			<h2><?php esc_html_e( 'Usage', 'udoc-viewer' ); ?></h2>
			<p><?php esc_html_e( 'Use the shortcode in any post or page:', 'udoc-viewer' ); ?></p>
			<code>[udoc-viewer src="https://example.com/document.pdf"]</code>
			<p><?php esc_html_e( 'Or use a WordPress media attachment ID:', 'udoc-viewer' ); ?></p>
			<code>[udoc-viewer src="123"]</code>
			<h3><?php esc_html_e( 'Shortcode Attributes', 'udoc-viewer' ); ?></h3>
			<table class="widefat striped" style="max-width: 800px;">
				<thead>
					<tr>
						<th><?php esc_html_e( 'Attribute', 'udoc-viewer' ); ?></th>
						<th><?php esc_html_e( 'Default', 'udoc-viewer' ); ?></th>
						<th><?php esc_html_e( 'Description', 'udoc-viewer' ); ?></th>
					</tr>
				</thead>
				<tbody>
					<tr><td><code>src</code></td><td>—</td><td><?php esc_html_e( 'Document URL or attachment ID (required)', 'udoc-viewer' ); ?></td></tr>
					<tr><td><code>width</code></td><td>100%</td><td><?php esc_html_e( 'Container width (CSS value)', 'udoc-viewer' ); ?></td></tr>
					<tr><td><code>height</code></td><td>600px</td><td><?php esc_html_e( 'Container height (CSS value)', 'udoc-viewer' ); ?></td></tr>
					<tr><td><code>theme</code></td><td>light</td><td><?php esc_html_e( 'light, dark, or system', 'udoc-viewer' ); ?></td></tr>
					<tr><td><code>toolbar</code></td><td>true</td><td><?php esc_html_e( 'Show/hide the top toolbar', 'udoc-viewer' ); ?></td></tr>
					<tr><td><code>search</code></td><td>true</td><td><?php esc_html_e( 'Enable/disable search', 'udoc-viewer' ); ?></td></tr>
					<tr><td><code>fullscreen</code></td><td>true</td><td><?php esc_html_e( 'Enable/disable fullscreen button', 'udoc-viewer' ); ?></td></tr>
					<tr><td><code>text-selection</code></td><td>true</td><td><?php esc_html_e( 'Enable/disable text selection', 'udoc-viewer' ); ?></td></tr>
				</tbody>
			</table>
		</div>
		<?php
	}

	// --- Field renderers ---

	public static function render_password_field( $args ) {
		$value = get_option( $args['name'], '' );
		printf(
			'<input type="password" name="%s" value="%s" class="regular-text" autocomplete="off">',
			esc_attr( $args['name'] ),
			esc_attr( $value )
		);
	}

	public static function render_text_field( $args ) {
		$value = get_option( $args['name'], '' );
		printf(
			'<input type="text" name="%s" value="%s" class="regular-text">',
			esc_attr( $args['name'] ),
			esc_attr( $value )
		);
		if ( ! empty( $args['description'] ) ) {
			printf( '<p class="description">%s</p>', esc_html( $args['description'] ) );
		}
	}

	public static function render_select_field( $args ) {
		$value = get_option( $args['name'], '' );
		printf( '<select name="%s">', esc_attr( $args['name'] ) );
		foreach ( $args['options'] as $key => $label ) {
			printf(
				'<option value="%s" %s>%s</option>',
				esc_attr( $key ),
				selected( $value, $key, false ),
				esc_html( $label )
			);
		}
		echo '</select>';
	}

	public static function render_checkbox_field( $args ) {
		$value = get_option( $args['name'], false );
		printf(
			'<label><input type="checkbox" name="%s" value="1" %s> %s</label>',
			esc_attr( $args['name'] ),
			checked( $value, true, false ),
			esc_html( $args['description'] ?? '' )
		);
	}

	public static function render_asset_mode_field() {
		$value = get_option( 'udoc_asset_mode', 'cdn' );
		?>
		<fieldset>
			<label>
				<input type="radio" name="udoc_asset_mode" value="cdn" <?php checked( $value, 'cdn' ); ?>>
				<?php esc_html_e( 'CDN (recommended)', 'udoc-viewer' ); ?>
				<p class="description"><?php esc_html_e( 'Load viewer assets from jsDelivr CDN. No server configuration needed.', 'udoc-viewer' ); ?></p>
			</label>
			<br>
			<label>
				<input type="radio" name="udoc_asset_mode" value="self-hosted" <?php checked( $value, 'self-hosted' ); ?>>
				<?php esc_html_e( 'Self-Hosted', 'udoc-viewer' ); ?>
				<p class="description"><?php esc_html_e( 'Serve viewer assets from your own server. Requires uploading the SDK files and configuring the base URL below.', 'udoc-viewer' ); ?></p>
			</label>
		</fieldset>
		<?php
	}
}
