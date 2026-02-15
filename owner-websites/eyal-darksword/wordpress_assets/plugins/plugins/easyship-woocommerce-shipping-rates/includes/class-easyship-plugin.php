<?php
/**
 * Easyship Plugin lifecycle manager class.
 *
 * @package Easyship
 */

declare(strict_types=1);

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

// EASYSHIP_PLUGIN_FILE must be defined by this time!
define( 'EASYSHIP_PATH', plugin_dir_path( EASYSHIP_PLUGIN_FILE ) );
define( 'EASYSHIP_URL', plugin_dir_url( EASYSHIP_PLUGIN_FILE ) );
define( 'EASYSHIP_BASENAME', plugin_basename( EASYSHIP_PLUGIN_FILE ) );

require_once EASYSHIP_PATH . 'includes/class-easyship-constants.php';
require_once EASYSHIP_PATH . 'includes/class-easyship-utils.php';
require_once EASYSHIP_PATH . 'includes/class-easyship-logger.php';

/**
 * This class handles the lifecycle of the Easyship plugin.
 */
final class Easyship_Plugin {
	/**
	 * This plugin's version.
	 */
	public const VERSION = Easyship_Constants::PLUGIN_VERSION;

	/**
	 * Singleton instance.
	 *
	 * @var ?Easyship_Plugin
	 */
	private static $singleton = null;

	/**
	 * Get the singleton instance of the Easyship_Plugin class.
	 */
	public static function singleton(): Easyship_Plugin {
		if ( ! self::$singleton ) {
			self::$singleton = new self();
		}
		return self::$singleton;
	}

	/**
	 * Constructor.
	 * It is intentionally left empty.
	 */
	private function __construct() {
		// This is intentionally left empty.
	}

	/**
	 * WooCommerce integration instance.
	 *
	 * @var ?Easyship_WooCommerce_Integration
	 */
	private $woocommerce_integration = null;

	/**
	 * Loads the WooCommerce integration libs into the PHP process.
	 */
	private static function load_woocommerce_integration(): void {
		require_once EASYSHIP_PATH . 'includes/woocommerce/class-easyship-woocommerce-integration.php';
	}

	/**
	 * Get the WooCommerce integration instance, if any.
	 */
	public function woocommerce_integration(): ?Easyship_WooCommerce_Integration {
		return $this->woocommerce_integration;
	}

	/**
	 * Setup WordPress hooks for the plugin.
	 */
	public function hook_into_wordpress(): void {
		self::load_woocommerce_integration();

		/**
		 * Activation callback.
		 *
		 * @param bool $network_wide Provided by WP on multisite activation.
		 */
		register_activation_hook( EASYSHIP_PLUGIN_FILE, function ( $network_wide ): void {
			$this->ensure_requirements_are_present();
			$this->upgrade_on_plugin_activation( $network_wide );
		} );

		// Load plugin textdomain.
		add_action( 'plugins_loaded', function (): void {
			load_plugin_textdomain( 'easyship-woocommerce-shipping-rates', false, dirname( plugin_basename( EASYSHIP_PLUGIN_FILE ) ) . '/languages' );
			$this->upgrade_if_necessary();
		}, 5 );

		add_action( 'init', array( $this, 'init' ) );

		Easyship_WooCommerce_Integration::hook_into_woocommerce();
	}

	/**
	 * Initialize the plugin.
	 * Initializes the WooCommerce integration if WooCommerce is active.
	 */
	public function init(): void {
		// Determine if we are to enable the WooCommerce integration.
		if ( class_exists( 'WooCommerce' ) || function_exists( 'WC' ) || defined( 'WC_ABSPATH' ) ) {
			$this->woocommerce_integration = new Easyship_WooCommerce_Integration();
		}

		// Initialize the WooCommerce integration if WooCommerce is active.
		if ( $this->woocommerce_integration ) {
			$this->woocommerce_integration->init();
		} else {
			add_action( 'admin_notices', function (): void {
				$message = sprintf(
					/* translators: %s: WooCommerce plugin URL */
					esc_html__( 'Easyship requires WooCommerce to be installed and active. You can download %s here.', 'easyship-woocommerce-shipping-rates' ),
					'<a href="https://wordpress.org/plugins/woocommerce/" target="_blank">WooCommerce</a>'
				);
				echo '<div class="error"><p><strong>' . wp_kses_post( $message ) . '</strong></p></div>';
			} );
		}
	}

	/**
	 * Run cleanup tasks when the plugin is uninstalled.
	 *
	 * This method is static to allow it to be called from uninstall.php.
	 */
	public static function uninstall(): void {
		// This is invoked on a standalone lifecycle than the typical WordPress plugin, and so the initial entrypoint has not been invoked.
		// Therefore, we need to load the integration explicitly.
		self::load_woocommerce_integration();
		Easyship_WooCommerce_Integration::uninstall();
	}

	/**
	 * This function hooks on WordPress to perform a verification at plugin activation, ensuring that all required PHP extensions are present.
	 * If some requirements are not present, the plugin is deactivated, and a notice is shown to the user.
	 */
	private function ensure_requirements_are_present(): void {
		$missing = array();
		if ( ! extension_loaded( 'openssl' ) ) {
			$missing[] = 'OpenSSL';
		}
		if ( empty( $missing ) ) {
			return;
		}

		deactivate_plugins( plugin_basename( EASYSHIP_PLUGIN_FILE ) );

		$message = sprintf(
			/* translators: %s: list of missing PHP extensions */
			esc_html__( 'Easyship requires the following PHP extensions: %s. Please enable them and try again.', 'easyship-woocommerce-shipping-rates' ),
			esc_html( implode( ', ', $missing ) )
		);

		wp_die(
			wp_kses_post( $message ) . ' ' .
			sprintf(
				/* translators: %s: URL to Plugins admin screen */
				esc_html__( 'Return to the Plugins page: %s', 'easyship-woocommerce-shipping-rates' ),
				'<a href="' . esc_url( admin_url( 'plugins.php' ) ) . '">' . esc_html__( 'Plugins', 'easyship-woocommerce-shipping-rates' ) . '</a>'
			),
			esc_html__( 'Plugin activation halted', 'easyship-woocommerce-shipping-rates' ),
			array( 'response' => 200 )
		);
	}

	/**
	 * If network-activated, upgrade all sites. Otherwise, upgrade this site.
	 *
	 * @param bool $network_wide Provided by WP on multisite activation.
	 */
	private function upgrade_on_plugin_activation( bool $network_wide ): void {
		require_once EASYSHIP_PATH . 'includes/upgrader/class-easyship-plugin-upgrader.php';

		$do_upgrade = function (): void {
			( new Easyship_Plugin_Upgrader() )->do_upgrade();
		};

		if ( is_multisite() && $network_wide ) {
			$site_ids = get_sites( array(
				'fields' => 'ids',
				'number' => 0,
			) );
			foreach ( $site_ids as $blog_id ) {
				switch_to_blog( (int) $blog_id );
				try {
					$do_upgrade();
				} finally {
					restore_current_blog();
				}
			}
			return;
		}

		$do_upgrade();
	}

	/**
	 * Lazy per-site upgrade on the first normal (non-AJAX) load after deploy.
	 */
	private function upgrade_if_necessary(): void {
		if ( wp_doing_ajax() || wp_doing_cron() ) {
			return;
		}
		require_once EASYSHIP_PATH . 'includes/upgrader/class-easyship-plugin-upgrader.php';
		( new Easyship_Plugin_Upgrader() )->do_upgrade();
	}
}
