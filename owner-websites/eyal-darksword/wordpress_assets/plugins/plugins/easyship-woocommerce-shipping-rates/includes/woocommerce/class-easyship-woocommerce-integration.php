<?php
/**
 * Easyship WooCommerce primary class.
 *
 * @package Easyship\WooCommerce
 */

declare(strict_types=1);

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Easyship Integration Class.
 *
 * No need to check if WooCommerce is active here, as this class is only instantiated when WooCommerce is active.
 */
final class Easyship_WooCommerce_Integration {
	/**
	 * The ID to that should be used (as-is or as a basis for) any ID this plugin provides to WooCommerce.
	 */
	private const WC_ID = 'easyship';

	/**
	 * The ID of the settings class that this plugin will use with WooCommerce.
	 */
	private const WC_SETTINGS_API_ID = self::WC_ID;

	/**
	 * The ID of the shipping method that this plugin provides to WooCommerce.
	 */
	public const WC_SHIPPING_METHOD_ID = self::WC_SETTINGS_API_ID;

	/**
	 * The WP option name under which the Easyship API Access Token for WooCommerce is stored.
	 * We use an option here, to facilitate our job of storing the token globally and without explicitly needing to go through WooCommerce API requests. This allows us to automate the setting up of the token, e.g. via the Easyship registration process invoking a webhook provided by this plugin.
	 */
	public const OPTION__API_ACCESS_TOKEN = 'easyship_woocommerce_api_access_token';

	/**
	 * This string is used to generate a nonce that will be included in OAuth-related button forms. This nonce is paramount to allow us to avoid possible CSRF attacks, allowing unauthorized requests to send other requests to the Easyship API.
	 */
	private const ACTION_BUTTON_NONCE = 'action_button_nonce';

	/**
	 * Add WooCommerce filters for the plugin.
	 */
	public static function hook_into_woocommerce(): void {
		// Declare compatibility with HPOS WooCommerce.
		add_action( 'before_woocommerce_init', function (): void {
			if ( class_exists( \Automattic\WooCommerce\Utilities\FeaturesUtil::class ) ) {
				\Automattic\WooCommerce\Utilities\FeaturesUtil::declare_compatibility( 'custom_order_tables', EASYSHIP_PLUGIN_FILE, true );
			}
		} );
	}

	/**
	 * Retrieve the Easyship API global access token (i.e., the token that is common to all shipping methods).
	 * Returns an empty string if the token is not set.
	 *
	 * @return string
	 */
	public static function get_global_api_access_token(): string {
		$token = get_option( self::OPTION__API_ACCESS_TOKEN, null );
		if ( ! $token ) {
			return '';
		}
		return trim( (string) $token );
	}

	/**
	 * Store the value as the new Easyship API access token.
	 *
	 * @param string $token The new API access token to store.
	 */
	public static function set_global_api_access_token( string $token ): void {
		$token = is_scalar( $token ) ? trim( (string) $token ) : '';

		if ( '' === $token ) {
			delete_option( self::OPTION__API_ACCESS_TOKEN );
			return;
		}

		update_option( self::OPTION__API_ACCESS_TOKEN, $token, false );
	}

	/**
	 * Initialize the WooCommerce integration.
	 */
	public function init(): void {
		require_once EASYSHIP_PATH . 'includes/woocommerce/class-easyship-wc-endpoints.php';
		Easyship_WC_Endpoints::rest_api_init();

		add_action( 'woocommerce_shipping_init', array( $this, 'init_shipping' ) );
		add_filter( 'woocommerce_shipping_methods', array( $this, 'add_shipping_method' ) );

		add_filter( 'plugin_action_links_' . EASYSHIP_BASENAME, array( $this, 'plugin_action_links' ) );

		add_action( 'admin_enqueue_scripts', array( $this, 'enqueue_admin_page_assets' ) );

		add_action( 'wp_ajax_easyship_connect', array( $this, 'ajax_callback__connect_to_easyship' ) );
	}

	/**
	 * Run cleanup tasks when the plugin is uninstalled.
	 *
	 * This method is static to allow it to be called from uninstall.php.
	 */
	public static function uninstall(): void {
		global $wpdb;

		$delete_for_site = function () use ( $wpdb ): void {
			// Delete options.
			$explicit_keys = array(
				self::OPTION__API_ACCESS_TOKEN,
				'woocommerce_' . self::WC_SHIPPING_METHOD_ID . '_settings', // WooCommerce global settings for our shipping method.
			);
			foreach ( $explicit_keys as $key ) {
				delete_option( $key );
			}

			// Delete ALL instance settings: "woocommerce_{self::WC_SHIPPING_METHOD_ID}_{instance_id}_settings"
			// We avoid calling WooCommerce APIs during uninstall (they may not be loaded).
			$like_pattern = $wpdb->esc_like( 'woocommerce_' . self::WC_SHIPPING_METHOD_ID . '_' ) . '%_settings';
			$option_names = $wpdb->get_col(
				$wpdb->prepare(
					"SELECT option_name FROM {$wpdb->options} WHERE option_name LIKE %s",
					$like_pattern
				)
			);
			if ( $option_names ) {
				foreach ( $option_names as $name ) {
					delete_option( $name );
				}
			}
		};

		// Run on every site if network‑activated.
		if ( is_multisite() ) {
			$site_ids = get_sites( array( 'fields' => 'ids' ) );
			$current  = get_current_blog_id();

			foreach ( $site_ids as $site_id ) {
				switch_to_blog( (int) $site_id );
				$delete_for_site();
			}

			// Return to original site.
			switch_to_blog( (int) $current );
		} else {
			$delete_for_site();
		}
	}

	/**
	 * Add Settings link to plugin page
	 *
	 * @param array $links Plugin links.
	 */
	public function plugin_action_links( array $links ): array {
		return array_merge(
			$links,
			array( '<a href="' . admin_url( 'admin.php?page=wc-settings&tab=shipping&section=easyship' ) . '"> ' . esc_html__( 'Settings', 'easyship-woocommerce-shipping-rates' ) . '</a>' )
		);
	}

	/**
	 * Initialize the shipping logic of the plugin.
	 */
	public function init_shipping(): void {
		// Load our Shipping Method class.
		require_once EASYSHIP_PATH . 'includes/woocommerce/class-easyship-wc-shipping-method.php';
	}

	/**
	 * Add a new shipping method to WooCommerce.
	 *
	 * @param array $methods WooCommerce shipping methods.
	 */
	public function add_shipping_method( array $methods ): array {
		$methods[ self::WC_ID ] = 'Easyship_WC_Shipping_Method';

		return $methods;
	}

	/**
	 * Enqueue scripts and assets for WC admin page support for this plugin.
	 *
	 * @param string $hook The current admin page hook.
	 */
	public function enqueue_admin_page_assets( $hook ): void {
		// Scope to WooCommerce settings page.
		if ( 'woocommerce_page_wc-settings' === $hook ) {
			// Read and sanitize query args like WooCommerce core does.
			// phpcs:ignore WordPress.Security.NonceVerification.Recommended
			$tab = isset( $_GET['tab'] ) ? sanitize_text_field( wp_unslash( $_GET['tab'] ) ) : '';
			// phpcs:ignore WordPress.Security.NonceVerification.Recommended
			$section = isset( $_GET['section'] ) ? sanitize_text_field( wp_unslash( $_GET['section'] ) ) : '';

			if ( 'shipping' === $tab ) {
				if ( 'easyship' === $section ) {
					$nonce = wp_create_nonce( self::ACTION_BUTTON_NONCE );

					try {
						$version = str_replace( '.', '_', Easyship_Constants::PLUGIN_VERSION );
					} catch ( \Throwable $e ) {
						// Fallback: current UTC date, e.g. 20250913.
						$version = gmdate( 'Ymd' );
					}

					wp_enqueue_script(
						'easyship_ajax_action',
						EASYSHIP_URL . 'assets/js/admin/ajax_oauth_es.js',
						array( 'jquery' ),
						$version,
						true
					);

					// Add nonce to AJAX call.
					wp_localize_script(
						'easyship_ajax_action',
						'easyship_ajax_action_params',
						array(
							'nonce' => $nonce,
							'url'   => admin_url( 'admin-ajax.php' ),
							'msg__already_connected_are_you_sure' => esc_attr__( "There is already a connection to Easyship.\nIf you continue, the connection will be replaced with a new one.\nContinue?", 'easyship-woocommerce-shipping-rates' ),
						)
					);
				}
			}
		}
	}

	/**
	 * Oauth callback.
	 */
	public function ajax_callback__connect_to_easyship(): void {
		$this->validate_ajax_invocation();

		require_once EASYSHIP_PATH . 'includes/woocommerce/class-easyship-wc-registration.php';
		$obj = new Easyship_WC_Registration();

		$res = $obj->send_request();

		wp_send_json( $res );
	}

	/**
	 * Verify nonce for security.
	 */
	private function validate_ajax_invocation(): void {
		if ( check_ajax_referer( self::ACTION_BUTTON_NONCE, 'nonce', false ) ) {
			return;
		}
		wp_send_json_error( 'Nonce verification failed.' );
	}
}
