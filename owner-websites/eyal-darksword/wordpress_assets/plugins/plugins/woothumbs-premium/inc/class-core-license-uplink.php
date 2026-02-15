<?php
/**
 * License related functions for the uplink service.
 *
 * @package iconic-core
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

if ( class_exists( 'Iconic_WooThumbs_Core_License_Uplink' ) ) {
	return;
}

use Iconic_WooThumbs_NS\StellarWP\Uplink\Admin\License_Field;
use Iconic_WooThumbs_NS\StellarWP\Uplink\Config;
use Iconic_WooThumbs_NS\StellarWP\Uplink\Uplink;
use Iconic_WooThumbs_NS\StellarWP\Uplink\Register;

/**
 * Iconic_WooThumbs_Core_License_Uplink.
 *
 * @class    Iconic_WooThumbs_Core_License_Uplink
 * @version  1.0.0
 */
class Iconic_WooThumbs_Core_License_Uplink {
	/**
	 * Single instance of the Iconic_WooThumbs_Core_License_Uplink object.
	 *
	 * @var Iconic_WooThumbs_Core_License_Uplink|null
	 */
	public static $single_instance = null;
	/**
	 * Class args.
	 *
	 * @var array
	 */
	public static $args = array(
		'plugins_loaded_hook_priority' => 0,
	);

	/**
	 * Creates/returns the single instance Iconic_WooThumbs_Core_License_Uplink object.
	 *
	 * @param array $args Arguments.
	 *
	 * @return Iconic_WooThumbs_Core_License_Uplink
	 */
	public static function run( $args = array() ) {
		if ( null === self::$single_instance ) {
			self::$args            = wp_parse_args( $args, self::$args );
			self::$single_instance = new self();
		}

		return self::$single_instance;
	}

	/**
	 * Construct.
	 */
	private function __construct() {
		add_action( 'plugins_loaded', array( __CLASS__, 'plugins_loaded' ), self::$args['plugins_loaded_hook_priority'] );
		add_action( 'admin_enqueue_scripts', array( __CLASS__, 'dequeue_scripts_and_styles' ), 9999 );
		add_action( 'wpsf_after_field_' . self::$args['option_group'] . '_dashboard_general_license_field', array( __CLASS__, 'license_field' ) );
		add_filter( 'plugin_action_links_' . self::$args['basename'], array( __CLASS__, 'add_action_links' ) );
		add_filter( 'stellarwp/uplink/' . self::$args['plugin_slug'] . '/license_field_group_name', array( __CLASS__, 'license_field_group_name' ), 10, 3 );
	}

	/**
	 * Plugins loaded.
	 */
	public static function plugins_loaded() {
		if ( ! is_admin() ) {
			return;
		}

		$container = self::$args['container_class']::instance()->container();
		Config::set_container( $container );
		Config::set_hook_prefix( self::$args['plugin_slug'] );

		Uplink::init();

		Register::plugin(
			self::$args['plugin_slug'],
			self::$args['plugin_name'],
			self::$args['plugin_version'],
			self::$args['plugin_path'],
			self::$args['plugin_class'],
			self::$args['license_class']
		);
	}

	/**
	 * Dequeue other uplink scripts.
	 */
	public static function dequeue_scripts_and_styles() {
		global $wp_scripts, $wp_styles; // Use the global $wp_scripts and $wp_styles variables

		if ( ! Iconic_WooThumbs_Core_Settings::is_settings_page() ) {
			return;
		}

		$queues = array(
			'wp_scripts' => $wp_scripts,
			'wp_styles'  => $wp_styles,
		);

		foreach ( $queues as $queue_name => $queue_object ) {
			if ( ! empty( $queue_object->queue ) ) {
				foreach ( $queue_object->queue as $handle ) {
					// Check if the handle begins with "stellarwp-uplink-license-admin-" and is not "stellarwp-uplink-license-admin-[plugin-slug]"
					if ( strpos( $handle, 'stellarwp-uplink-license-admin-' ) === 0 && $handle !== 'stellarwp-uplink-license-admin-' . self::$args['plugin_slug'] ) {
						// Dequeue the script or style
						if ( 'wp_scripts' === $queue_name ) {
							wp_dequeue_script( $handle );
						} elseif ( 'wp_styles' === $queue_name ) {
							wp_dequeue_style( $handle );
						}
					}
				}
			}
		}
	}

	/**
	 * Output license field.
	 */
	public static function license_field() {
		$container = Config::get_container();
		$container->get( License_Field::class )->render_single( self::$args['plugin_slug'], false, false );
	}

	/**
	 * Add action links to "plugins" page.
	 *
	 * @param array $links Links.
	 *
	 * @return array
	 */
	public static function add_action_links( $links ) {
		$links[] = sprintf( '<a href="%s" target="_blank">%s</a>', esc_url( self::$args['urls']['product'] ) . '/changelog/?utm_source=Iconic&utm_medium=Plugin&utm_campaign=changelog-link&utm_content=iconic-woothumbs', __( 'Changelog', 'iconic-woothumbs' ) );

		return $links;
	}

	/**
	 * License field group name.
	 *
	 * @param string $group_name   Group name.
	 * @param string $uplink_group Uplink group.
	 * @param string $modifier     Modifier.
	 *
	 * @return string
	 */
	public static function license_field_group_name( $group_name, $uplink_group, $modifier ) {
		return self::$args['option_group'];
	}
}
