<?php
/**
 * AJAX.
 *
 * @package iconic-onboard
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

if ( class_exists( 'Iconic_WooThumbs_Onboard_Ajax' ) ) {
	return;
}

/**
 * Iconic_WooThumbs_Onboard_Ajax.
 */
class Iconic_WooThumbs_Onboard_Ajax {
	/**
	 * Plugin Slug.
	 *
	 * @var mixed $plugin_slug
	 */
	protected static $plugin_slug;

	/**
	 * Init
	 *
	 * @param array $args Configuration settings.
	 */
	public static function run( $args ) {
		self::$plugin_slug = $args['plugin_slug'];

		self::add_ajax_events();
	}

	/**
	 * Hook in methods - uses WordPress ajax handlers (admin-ajax).
	 */
	public static function add_ajax_events() {
		$ajax_events = array(
			'dismiss_modal'  => false,
			'save_modal'     => false,
			'install_plugin' => false,
		);

		$plugin_slug = self::$plugin_slug;

		foreach ( $ajax_events as $ajax_event => $nopriv ) {
			add_action( "wp_ajax_iconic_onboard_{$plugin_slug}_{$ajax_event}", array( __CLASS__, $ajax_event ) );

			if ( $nopriv ) {
				add_action( "wp_ajax_nopriv_iconic_onboard_{$plugin_slug}_{$ajax_event}", array( __CLASS__, $ajax_event ) );
			}
		}
	}

	/**
	 * Save dimiss key in wp_options when user dismiss modal
	 *
	 * @return void
	 */
	public static function dismiss_modal() {
		check_ajax_referer( 'iconic-onboard', 'security' );

		$plugin_slug = filter_input( INPUT_POST, 'plugin_slug' );

		if ( $plugin_slug ) {
			update_option( "{$plugin_slug}_onboard_dismiss_modal", '1' );
			wp_send_json_success();
		}
	}

	/**
	 * Runs when modal is saved.
	 *
	 * @return void
	 */
	public static function save_modal() {
		check_ajax_referer( 'iconic-onboard', 'security' );

		$plugin_slug = filter_input( INPUT_POST, 'plugin_slug' );

		if ( $plugin_slug ) {
			$fields_str = filter_input( INPUT_POST, 'fields' );
			$fields_arr = array();
			parse_str( $fields_str, $fields_arr );

			$result = array(
				'success' => true,
			);

			$result = apply_filters( "iconic_onboard_save_{$plugin_slug}_result", $result, $fields_arr );

			if ( ! empty( $result['success'] ) ) {
				update_option( "{$plugin_slug}_onboard_save_modal", '1' );
			}

			wp_send_json( $result );
		}
	}

	/**
	 * Install a plugin from .org in the background via a cron job (used by
	 * installer - opt in).
	 *
	 * @throws Exception If unable to proceed with plugin installation.
	 * @since  2.6.0
	 */
	public static function install_plugin() {
		$plugin_data = (array) filter_input( INPUT_POST, 'plugin_data', FILTER_DEFAULT, FILTER_REQUIRE_ARRAY );

		if ( empty( $plugin_data ) ) {
			wp_send_json_error();
		}

		$success = array(
			'button' => '<a href="#" class="button button-large button-primary iconic-onboard-modal__button iconic-onboard-modal__nextslide ">' . __( 'Installed', 'iconic-onboard' ) . ' <span class="dashicons dashicons-yes"></span></a>',
		);

		if ( ! empty( $plugin_data['repo-slug'] ) ) {
			require_once ABSPATH . 'wp-admin/includes/file.php';
			require_once ABSPATH . 'wp-admin/includes/plugin-install.php';
			require_once ABSPATH . 'wp-admin/includes/class-wp-upgrader.php';
			require_once ABSPATH . 'wp-admin/includes/plugin.php';

			WP_Filesystem();

			$skin              = new Automatic_Upgrader_Skin();
			$upgrader          = new WP_Upgrader( $skin );
			$installed_plugins = array_reduce( array_keys( get_plugins() ), array( 'Iconic_WooThumbs_Onboard', 'associate_plugin_file' ) );

			if ( empty( $installed_plugins ) ) {
				$installed_plugins = array();
			}

			$plugin_slug = $plugin_data['repo-slug'];
			$plugin_file = isset( $plugin_data['file'] ) ? $plugin_data['file'] : $plugin_slug . '.php';
			$installed   = false;
			$activate    = false;

			// See if the plugin is installed already.
			if ( isset( $installed_plugins[ $plugin_file ] ) ) {
				$installed = true;
				$activate  = ! is_plugin_active( $installed_plugins[ $plugin_file ] );
			}

			// Install this thing!
			if ( ! $installed ) {
				// Suppress feedback.
				ob_start();

				try {
					$plugin_information = plugins_api(
						'plugin_information',
						array(
							'slug'   => $plugin_slug,
							'fields' => array(
								'short_description' => false,
								'sections'          => false,
								'requires'          => false,
								'rating'            => false,
								'ratings'           => false,
								'downloaded'        => false,
								'last_updated'      => false,
								'added'             => false,
								'tags'              => false,
								'homepage'          => false,
								'donate_link'       => false,
								'author_profile'    => false,
								'author'            => false,
							),
						)
					);

					if ( is_wp_error( $plugin_information ) ) {
						wp_send_json_error();
					}

					$package  = $plugin_information->download_link;
					$download = $upgrader->download_package( $package );

					if ( is_wp_error( $download ) ) {
						wp_send_json_error();
					}

					$working_dir = $upgrader->unpack_package( $download, true );

					if ( is_wp_error( $working_dir ) ) {
						wp_send_json_error();
					}

					$result = $upgrader->install_package(
						array(
							'source'                      => $working_dir,
							'destination'                 => WP_PLUGIN_DIR,
							'clear_destination'           => false,
							'abort_if_destination_exists' => false,
							'clear_working'               => true,
							'hook_extra'                  => array(
								'type'   => 'plugin',
								'action' => 'install',
							),
						)
					);

					if ( is_wp_error( $result ) ) {
						wp_send_json_error();
					}

					$activate = true;
				} catch ( Exception $e ) {
					wp_send_json_error();
				}

				// Discard feedback.
				ob_end_clean();
			}

			wp_clean_plugins_cache();

			// Activate this thing.
			if ( $activate ) {
				try {
					$result = activate_plugin( $installed ? $installed_plugins[ $plugin_file ] : $plugin_slug . '/' . $plugin_file );

					if ( is_wp_error( $result ) ) {
						wp_send_json_error();
					}

					wp_send_json_success( $success );
				} catch ( Exception $e ) {
					wp_send_json_error();
				}
			}
		}

		wp_send_json_success( $success );
	}
}
