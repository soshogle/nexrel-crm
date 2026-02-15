<?php
/**
 * Autoload expire notice controller.
 *
 * @note we require our autoload files everytime and everywhere after plugin load.
 * @since 8.1
 */

if ( ! defined( 'ABSPATH' ) ) {
	die( '-1' );
}

/**
 * Controller for plugin license expire notice system.
 * We use it to notify users about license expire update.
 *
 * @since 8.1
 */
class Vc_Expire_Notice_Controller {
	/**
	 * The slug of user meta that stores expire notice list that user close.
	 *
	 * @var string
	 * @since 8.1
	 */
	public $expire_notice_list = 'wpb_expire_close_list';

	/**
	 * WPBakery link for purchase.
	 *
	 * @since 8.7
	 * @var string
	 */
	public $no_license_link = 'https://wpbakery.com?utm_source=wpdashboard&utm_medium=banner&utm_campaign=wpb-purchase&utm_content=text-notification';

	/**
	 * WPBakery link for purchase.
	 *
	 * @since 8.7
	 * @var string
	 */
	public $expired_link = 'https://support.wpbakery.com/renewal-options/%s?utm_source=wpdashboard&utm_medium=banner&utm_campaign=wpb-renew-support&utm_content=text-notification';

	/**
	 * Vc_Expire_Notice_Controller constructor.
	 *
	 * @since 8.1
	 */
	public function __construct() {
		add_action( 'admin_notices', [
			$this,
			'handle_notice',
		] );

		add_action( 'wp_ajax_wpb_dismiss_expire_notice', [
			$this,
			'dismiss_notice',
		] );
	}

	/**
	 * Check if WPBakery plugin has update available or not.
	 *
	 * @return bool
	 */
	public function check_for_plugin_update() {
		$plugin_slug = 'js_composer/js_composer.php';
		$updates = get_site_transient( 'update_plugins' );

		if ( isset( $updates->response[ $plugin_slug ] ) ) {
			return true;
		}

		return false;
	}

	/**
	 * Dismiss support expire notice.
	 *
	 * @since 8.7
	 * @return void
	 */
	public function dismiss_notice() {
		vc_user_access()->checkAdminNonce()->validateDie();

		$is_set = $this->save_expire_notice_close();

		if ( $is_set ) {
			wp_send_json_success( true );
		} else {
			wp_send_json_error( false );
		}
	}

	/**
	 * Save expire notice close to user meta.
	 *
	 * @since 8.1
	 * @return bool|int
	 */
	public function save_expire_notice_close() {
		$notice_type = vc_post_param( 'notice_type' );
		if ( empty( $notice_type ) ) {
			return false;
		}

		$user_id = get_current_user_id();
		$notice_list = json_decode( get_user_meta( $user_id, $this->expire_notice_list, true ), true );

		if ( empty( $notice_list ) ) {
			$notice_list = [];
		}

		if ( ! isset( $notice_list[ $notice_type ] ) ) {
			$notice_list[ $notice_type ] = [];
		}

		if ( ! in_array( WPB_VC_VERSION, $notice_list[ $notice_type ] ) ) {
			$notice_list[ $notice_type ][] = WPB_VC_VERSION;
		}

		return update_user_meta( $user_id, $this->expire_notice_list, wp_json_encode( $notice_list ) );
	}

	/**
	 * This method responsible to show admin_notice.
	 *
	 * @since 8.7
	 */
	public function handle_notice() {
		if ( ! vc_license()->isActivated() ) {
			$this->output_notice( 'not_active_license', 'warning' );
			return;
		}

		if ( vc_license()->isExpired() ) {
			$this->output_notice( 'expired_plugin', 'warning' );

			if ( $this->check_for_plugin_update() ) {
				$this->output_notice( 'expired_plugin_update', 'error' );
			}
		}
	}

	/**
	 * Check if we should output notice.
	 *
	 * @since 8.7
	 * @param string $type
	 * @return bool
	 */
	public function is_output_notice( $type ) {
		$user_id = get_current_user_id();
		$notice_list = json_decode( get_user_meta( $user_id, $this->expire_notice_list, true ), true );
		if ( empty( WPB_VC_VERSION ) ) {
			return false;
		}

		if ( ! isset( $notice_list[ $type ] ) || ! is_array( $notice_list[ $type ] ) ) {
			return true;
		}

		if ( in_array( WPB_VC_VERSION, $notice_list[ $type ] ) ) {
			return false;
		}

		return true;
	}

	/**
	 * Output notice
	 *
	 * @since 8.1
	 * @param string $type
	 * @param string $level
	 */
	public function output_notice( $type, $level ) {
		if ( ! $this->is_output_notice( $type ) ) {
			return;
		}

		$message = $this->get_notice_message( $type );
		if ( empty( $message ) ) {
			return;
		}

		$classes = 'notice notice-' . esc_attr( $level ) . ' is-dismissible wpb-notice wpb-update-expire-notice';
		printf( '<div data-wpb-expire-notice-type="%s" class="%s"><p>%s</p></div>',
			esc_attr( $type ),
			esc_attr( $classes ),
			wp_kses( $message, [
				'a' => [
					'href' => [],
					'title' => [],
					'target' => [],
					'rel' => [],
				],
			])
		);
		vc_include_template( 'params/notice/expire-notice-assets.php' );
	}

	/**
	 * Get the dynamic expired link with license key.
	 *
	 * @since 8.7
	 * @return string
	 */
	public function get_expired_link() {
		$license_key = vc_license()->getLicenseKey();
		if ( empty( $license_key ) ) {
			return 'https://support.wpbakery.com/licenses?utm_source=wpdashboard&utm_medium=banner&utm_campaign=wpb-renew-support&utm_content=text-notification';
		}
		return sprintf( $this->expired_link, $license_key );
	}

	/**
	 * Get notice message by notice type.
	 *
	 * @since 8.7
	 * @param string $type
	 * @return string
	 */
	public function get_notice_message( $type ) {
		$message = '';
		switch ( $type ) {
			case 'expired_plugin':
				$message = sprintf( ' ' . esc_html__( 'Your WPBakery support period, automatic updates, and access to cloud features have expired, putting your site at risk in the future. Subscribe to Support Plus in the %1$sCustomer Center%2$s.', 'js_composer' ),
					'<a target="_blank" href="' . esc_url( $this->get_expired_link() ) . '">',
					'</a>'
				);
				break;
			case 'expired_plugin_update':
				$message = sprintf( ' ' . esc_html__( 'There is a new version of the WPBakery available. Automatic update is unavailable for this plugin. Visit the %1$slicense%2$s section for more information.', 'js_composer' ),
					'<a href="' . esc_url( vc_updater()->getUpdaterUrl() ) . '">',
					'</a>'
				);
				break;
			case 'not_active_license':
				$message = sprintf( ' ' . esc_html__( 'Get a direct %1$sWPBakery license%2$s to unlock customer support, cloud services, and automatic updates or %3$sactivate your license%4$s.', 'js_composer' ),
					'<a target="_blank" href="' . esc_url( $this->no_license_link ) . '">',
					'</a>',
					'<a href="' . esc_url( vc_updater()->getUpdaterUrl() ) . '">',
					'</a>'
				);
				break;
		}

		return $message;
	}
}

new Vc_Expire_Notice_Controller();
