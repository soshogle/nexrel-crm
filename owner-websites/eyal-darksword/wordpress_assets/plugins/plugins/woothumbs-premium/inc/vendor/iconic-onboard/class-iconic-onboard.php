<?php
/**
 * Onboard.
 *
 * @package iconic-onboard
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

if ( class_exists( 'Iconic_WooThumbs_Onboard' ) ) {
	return;
}

/**
 * Iconic_WooThumbs_Onboard.
 *
 * @class    Iconic_WooThumbs_Onboard
 * @version  1.0.5
 */
class Iconic_WooThumbs_Onboard {
	/**
	 * Single instance of the Iconic_WooThumbs_Onboard object.
	 *
	 * @var Iconic_WooThumbs_Onboard
	 */
	public static $single_instance = null;

	/**
	 * Slide Defaults.
	 *
	 * @var array $slide_defaults
	 */
	protected static $slide_defaults = array(
		'title'     => '',
		'desc'      => '',
		'type'      => 'text',
		'default'   => '',
		'fields'    => array(),
		'choices'   => array(),
		'wait'      => null,
		'json_data' => array(),
	);

	/**
	 * Class args.
	 *
	 * @var array
	 */
	public static $args = array();

	/**
	 * Path.
	 *
	 * @var string $path
	 */
	public static $path = null;

	/**
	 * URL.
	 *
	 * @var string $url
	 */
	public static $url = null;

	/**
	 * Creates/returns the single instance Iconic_WooThumbs_Onboard object.
	 *
	 * @param array $args Configuration settings.
	 * - $args['plugin_slug'] A unique key for the plugin - Required.
	 * - $args['version']     Plugin version - Required.
	 * - $args['plugin_url']  Plugin URL - Required.
	 * - $args['plugin_path'] Plugin Path - Required.
	 *
	 * @return Iconic_WooThumbs_Onboard
	 */
	public static function run( $args = array() ) {
		if ( null === self::$single_instance ) {
			self::$args            = $args;
			self::$single_instance = new self();
		}

		return self::$single_instance;
	}

	/**
	 * Construct.
	 */
	private function __construct() {
		self::$path = self::$args['plugin_path'] . '/inc/vendor/iconic-onboard/';
		self::$url  = self::$args['plugin_url'] . '/inc/vendor/iconic-onboard/';

		$this->load_classes();

		$this->enqueue_assets();
		$this->insert_modal_html();
	}

	/**
	 * Enqueue assets.
	 */
	private function enqueue_assets() {
		add_action( 'admin_enqueue_scripts', array( $this, 'admin_scripts' ) );
	}

	/**
	 * Insert Modal HTML.
	 *
	 * @return void
	 */
	private function insert_modal_html() {
		add_action( 'wpsf_after_settings_' . self::$args['plugin_slug'], array( $this, 'modal_html' ) );
	}

	/**
	 * Load classes
	 *
	 * @return void
	 */
	private function load_classes() {
		require self::$path . '/inc/class-ajax.php';
		require self::$path . '/inc/class-settings.php';

		Iconic_WooThumbs_Onboard_Ajax::run( self::$args );
		Iconic_WooThumbs_Onboard_Settings::run( self::$args );
	}

	/**
	 * Enqueue admin scripts.
	 */
	public function admin_scripts() {
		wp_enqueue_script( 'iconic-modal', self::$url . 'assets/vendor/iconic-modal/jquery.iconic-modal.js', array( 'jquery' ), self::$args['version'], true );
		wp_enqueue_style( 'iconic-modal', self::$url . 'assets/vendor/iconic-modal/iconic-modal.css', array(), self::$args['version'] );

		wp_enqueue_script( 'jquery-toggle-switch', self::$url . 'assets/vendor/jquery-toggles/jquery.toggleswitch.min.js', array( 'jquery' ), self::$args['version'], true );
		wp_enqueue_style( 'jquery-toggle-switch', self::$url . 'assets/vendor/jquery-toggles/jquery.toggleswitch.min.css', array(), self::$args['version'] );

		wp_enqueue_script( 'iconic-onboard-js', self::$url . 'assets/js/main.js', array( 'jquery' ), self::$args['version'], true );
		wp_enqueue_style( 'iconic-onboard-css', self::$url . 'assets/css/main.css', array(), self::$args['version'] );

		$localization_data = array(
			'plugin_slug' => self::$args['plugin_slug'],
			'nonce'       => wp_create_nonce( 'iconic-onboard' ),
			'i18n'        => array(
				'error_install_plugin' => __( 'Oops! There was an issue installing the required plugin. Please try again or contact support.', 'iconic-onboard' ),
			),
		);

		wp_localize_script( 'iconic-onboard-js', 'iconic_onboarding_params', $localization_data );
	}

	/**
	 * Modal HTML.
	 *
	 * @return void
	 */
	public function modal_html() {
		$fname        = $this->get_admin_first_name();
		$modal_class  = '';
		$args         = apply_filters( 'iconic_onboard_args', self::$args );
		$plugin_slug  = $args['plugin_slug'];
		$slides       = $args['slides'];
		$disable_skip = isset( $args['disable_skip'] ) && $args['disable_skip'] ? true : false;
		$dismissed    = get_option( $plugin_slug . '_onboard_dismiss_modal' );
		$saved        = get_option( $plugin_slug . '_onboard_save_modal' );
		$defaults     = self::$slide_defaults;

		// If saved or dismissed.
		if ( $dismissed || $saved ) {
			$modal_class = 'iconic-onboard-modal--disable-auto-popup';
		}

		include self::$path . '/templates/admin/popup-slides.php';
	}

	/**
	 * Returns the first name of currently logged in user.
	 *
	 * @return false | string
	 */
	public static function get_admin_first_name() {
		$user = wp_get_current_user();

		if ( ! $user ) {
			return false;
		}
		$fname = get_user_meta( $user->data->ID, 'first_name', true );

		if ( empty( $fname ) ) {
			return ucwords( $user->data->display_name );
		} else {
			return ucwords( $fname );
		}
	}

	/**
	 * Get slug from path and associate it with the path.
	 *
	 * @param array  $plugins Associative array of plugin files to paths.
	 * @param string $key     Plugin relative path. Example: woocommerce/woocommerce.php.
	 *
	 * @return array
	 */
	public static function associate_plugin_file( $plugins, $key ) {
		$path                 = explode( '/', $key );
		$filename             = end( $path );
		$plugins[ $filename ] = $key;

		return $plugins;
	}
}
