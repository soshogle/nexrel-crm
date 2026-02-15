<?php
/**
 * License related functions for the uplink service.
 *
 * @package iconic-core
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

if ( class_exists( 'Iconic_WooThumbs_Core_Telemetry' ) ) {
	return;
}

use Iconic_WooThumbs_NS\StellarWP\Telemetry\Core as Telemetry;
use Iconic_WooThumbs_NS\StellarWP\Telemetry\Config;
use Iconic_WooThumbs_NS\StellarWP\Telemetry\Opt_In\Status;

/**
 * Iconic_WooThumbs_Core_Telemetry.
 *
 * @class    Iconic_WooThumbs_Core_Telemetry
 * @version  1.0.0
 */
class Iconic_WooThumbs_Core_Telemetry {
	/**
	 * Single instance of the Iconic_WooThumbs_Core_Telemetry object.
	 *
	 * @var Iconic_WooThumbs_Core_Telemetry|null
	 */
	public static $single_instance = null;
	/**
	 * Class args.
	 *
	 * @var array
	 */
	public static $args = array();

	/**
	 * Creates/returns the single instance Iconic_WooThumbs_Core_Telemetry object.
	 *
	 * @param array $args Arguments.
	 *
	 * @return Iconic_WooThumbs_Core_Telemetry
	 */
	public static function run( $args = array() ) {
		if ( null === self::$single_instance ) {
			$default_args = array(
				'settings_class'           => 'Iconic_WooThumbs_Core_Settings',
				'opt_out_settings_section' => 'license',
				'optin_setting_key'        => 'dashboard_general_optin',
			);

			self::$args            = wp_parse_args( $args, $default_args );
			self::$single_instance = new self();
		}

		return self::$single_instance;
	}

	/**
	 * Construct.
	 */
	private function __construct() {
		add_action( 'plugins_loaded', array( __CLASS__, 'plugins_loaded' ), 0 );
		add_action( 'wpsf_after_settings_' . self::$args['option_group'], array( __CLASS__, 'output_optin' ) );
		add_filter( 'stellarwp/telemetry/optin_args', array( __CLASS__, 'optin_args' ), 10, 2 );
		add_filter( 'stellarwp/telemetry/exit_interview_args', array( __CLASS__, 'exit_interview_args' ), 10, 2 );
		add_filter( 'wpsf_register_settings_' . self::$args['option_group'], array( __CLASS__, 'optin_setting' ), 20 );
		add_filter( 'plugins_loaded', array( __CLASS__, 'save_optin_setting' ) );
		add_filter( 'option_' . self::$args['option_group'] . '_settings', array( __CLASS__, 'update_settings_to_use_stellarwp_telemetry_optin_agreed_value' ) );
	}

	/**
	 * Plugins loaded.
	 */
	public static function plugins_loaded() {
		$container = self::$args['container_class']::instance()->container();
		Config::set_container( $container );

		// If STELLARWP_TELEMETRY_API_BASE_URL is defined, use that. Otherwise, use the default.
		$api_base_url = defined( 'STELLARWP_TELEMETRY_SERVER' ) ? STELLARWP_TELEMETRY_SERVER : 'https://telemetry.stellarwp.com';

		// Set the full URL for the Telemetry Server API.
		Config::set_server_url( $api_base_url . '/api/v1' );

		// Set a unique prefix for actions & filters.
		Config::set_hook_prefix( self::$args['plugin_slug'] );

		// Set a unique plugin slug.
		Config::set_stellar_slug( self::$args['plugin_slug'] );

		// Initialize the library.
		Telemetry::instance()->init( self::$args['file'] );
	}

	/**
	 * Output optin.
	 *
	 * @return void
	 */
	public static function output_optin() {
		/**
		 * Fires before the optin output.
		 *
		 * @since 1.0.0
		 */
		do_action( 'stellarwp/telemetry/' . self::$args['plugin_slug'] . '/optin' ); // phpcs:ignore WordPress.NamingConventions.ValidHookName.UseUnderscores
		?>
		<style>
			.stellarwp-telemetry-modal__inner {
				max-width: 800px;
			}

			.stellarwp-telemetry-modal__inner p,
			.stellarwp-telemetry-links {
				font-size: 14px;
				line-height: 1.6;
			}

			.stellarwp-telemetry-links {
				margin: 20px 0;
			}

			.stellarwp-telemetry-btn-primary {
				background: #5559DA;
			}

			.stellarwp-telemetry-btn-primary:hover {
				background: #4C50C4;
			}

			.stellarwp-telemetry-links__link {
				color: #5559DA;
			}

			.stellarwp-telemetry-links__link:hover {
				color: #4C50C4;
			}
		</style>
		<?php
	}

	/**
	 * Optin args.
	 *
	 * @param array  $args         Arguments.
	 * @param string $stellar_slug Slug of the plugin in telemetry.
	 *
	 * @return array
	 */
	public static function optin_args( $args, $stellar_slug ) {
		if ( self::$args['plugin_slug'] !== $stellar_slug ) {
			return $args;
		}

		$args['plugin_name'] = self::$args['plugin_name'];

		$args['heading'] = sprintf(
		// Translators: The plugin name.
			__( 'Opt in to help us enhance %s', 'iconic-woothumbs' ),
			self::$args['plugin_name']
		);

		$args['intro'] = sprintf(
		// Translators: The user name and the plugin name.
			__(
				'Hi, %1$s! We\'d love your help to improve %2$s. 
				By opting in, you\'ll share usage data from %2$s and future Iconic products with our team, allowing us to refine your experience. 
				As a bonus, we\'ll send you occasional product updates. 
				If you decide to skip this, no worries – %2$s will continue to work seamlessly for you.',
				'iconic-woothumbs'
			),
			wp_get_current_user()->display_name,
			self::$args['plugin_name']
		);

		$args['plugin_logo']        = self::$args['plugin_url'] . 'assets/img/iconic-logo.svg';
		$args['plugin_logo_width']  = 160;
		$args['plugin_logo_height'] = 35;

		$args['permissions_url'] = 'https://iconicwp.com/telemetry-tracking/?utm_source=Iconic&utm_medium=Plugin&utm_campaign=opt-in&utm_content=iconic-woothumbs';
		$args['tos_url']         = 'https://iconicwp.com/terms/?utm_source=Iconic&utm_medium=Plugin&utm_campaign=opt-in&utm_content=iconic-woothumbs';

		return $args;
	}

	/**
	 * Exit interview args.
	 *
	 * @param array  $args         Arguments.
	 * @param string $stellar_slug Slug of the plugin in telemetry.
	 *
	 * @return array
	 */
	public static function exit_interview_args( $args, $stellar_slug ) {
		if ( self::$args['plugin_slug'] !== $stellar_slug ) {
			return $args;
		}

		$args['plugin_logo']        = self::$args['plugin_url'] . 'assets/img/iconic-logo.svg';
		$args['plugin_logo_width']  = 160;
		$args['plugin_logo_height'] = 35;

		$args['uninstall_reasons'][] = [
			'uninstall_reason_id' => 'temporary',
			'uninstall_reason'    => __( "I'm just deactivating temporarily.", 'iconic-woothumbs' ),
		];

		return $args;
	}

	/**
	 * Get status.
	 *
	 * @return bool
	 */
	public static function get_status() {
		// If optin form is saving status, use that.
		$action       = filter_input( INPUT_POST, 'action', FILTER_SANITIZE_FULL_SPECIAL_CHARS );
		$stellar_slug = filter_input( INPUT_POST, 'stellar_slug', FILTER_SANITIZE_FULL_SPECIAL_CHARS );
		$optin_agreed = filter_input( INPUT_POST, 'optin-agreed', FILTER_SANITIZE_FULL_SPECIAL_CHARS );

		if ( 'stellarwp-telemetry' === $action && self::$args['plugin_slug'] === $stellar_slug && 'true' === $optin_agreed ) {
			return true;
		}

		$status_class = Config::get_container()->get( Status::class );
		$option       = $status_class->get_option();

		if ( ! isset( $option['plugins'] ) || ! isset( $option['plugins'][ self::$args['plugin_slug'] ] ) ) {
			return false;
		}

		return (bool) $option['plugins'][ self::$args['plugin_slug'] ]['optin'];
	}

	/**
	 * Optin setting.
	 *
	 * @param array $settings Settings.
	 *
	 * @return array
	 */
	public static function optin_setting( $settings = array() ) {
		$settings_class = self::$args['settings_class'];

		if ( ! method_exists( $settings_class, 'is_settings_page' ) || ! $settings_class::is_settings_page() ) {
			return $settings;
		}

		if ( empty( $settings['sections'] ) || empty( $settings['sections'][ self::$args['opt_out_settings_section'] ] ) ) {
			return $settings;
		}

		$status = self::get_status();

		$settings['sections'][ self::$args['opt_out_settings_section'] ]['fields'][] = array(
			'id'       => 'optin',
			'title'    => __( 'Opt In', 'iconic-woothumbs' ),
			// Translators: The telemetry terms URL.
			'subtitle' => sprintf( __( 'Help us improve this plugin by sharing <a href="%s" target="_blank">non-sensitive</a> data with us.', 'iconic-woothumbs' ), 'https://iconicwp.com/telemetry-tracking/?utm_source=Iconic&utm_medium=Plugin&utm_campaign=opt-in-setting&utm_content=iconic-woothumbs' ),
			'type'     => 'toggle',
			'default'  => $status,
		);

		return $settings;
	}

	/**
	 * Optin or out based on setting.
	 *
	 * @return void
	 */
	public static function save_optin_setting() {
		if ( ! is_admin() || ! empty( $_POST['post_type'] ) ) {
			return;
		}

		$settings_name = self::$args['option_group'] . '_settings';

		if ( empty( $_POST[ $settings_name ] ) ) {
			return;
		}

		$nonce = filter_input( INPUT_POST, '_wpnonce', FILTER_SANITIZE_FULL_SPECIAL_CHARS );

		if ( empty( $nonce ) ) {
			return;
		}

		// This nonce is set when saving settings.
		if ( ! wp_verify_nonce( $nonce, self::$args['option_group'] . '-options' ) ) {
			wp_die( esc_html__( 'Sorry, you can\'t do that.', 'iconic-woothumbs' ) );
		}

		// If set, then it's true. Else it's false.
		$optin = ! empty( $_POST[ $settings_name ][ self::$args['optin_setting_key'] ] );
		$current_status = self::get_status();

		if ( $optin === $current_status ) {
			return;
		}

		// Get an instance of the Status class.
		$status_class = Config::get_container()->get( Status::class );

		$status_class->set_status( $optin );
	}

	/**
	 * Update the `optin` setting to use the value of the `optin_agreed` stored in the `stellarwp_telemetry` option.
	 *
	 * Telemetry send or not data based on the `optin_agreed` value. Since we have this information in
	 * both places (plugin settings and `stellarwp_telemetry`), there is a chance they are not synced.
	 * That way, we rely on the value stored in `stellarwp_telemetry` option to show the current state.
	 *
	 * @param array $settings The option plugin settings.
	 * @return array
	 */
	public static function update_settings_to_use_stellarwp_telemetry_optin_agreed_value( $settings ) {
		$settings_class = self::$args['settings_class'];

		if ( ! method_exists( $settings_class, 'is_settings_page' ) || ! $settings_class::is_settings_page() ) {
			return $settings;
		}

		if ( ! isset( $settings[ self::$args['optin_setting_key'] ] ) ) {
			return $settings;
		}

		$settings[ self::$args['optin_setting_key'] ] = self::get_status();

		return $settings;
	}
}
