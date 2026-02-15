<?php
/**
 * Initializer functions for addon files.
 *
 * @package OTP\Notifications\WcSMSNotification
 */

/**
 * AddOn Name: WooCommerce SMS Notification
 * Plugin URI: http://miniorange.com
 * Description: Send out SMS notifications to admins, vendors, users.
 * Author: miniOrange
 * Author URI: http://miniorange.com
 * Text Domain: miniorange-otp-verification
 * WC requires at least: 2.0.0
 * WC tested up to: 3.3.4
 * License: Expat
 * License URI: https://plugins.miniorange.com/mit-license
 */

namespace OTP\Notifications\WcSMSNotification;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

use OTP\Notifications\WcSMSNotification\Handler\WooCommerceNotifications;
use OTP\Notifications\WcSMSNotification\Helper\MoWcAddOnMessages;
use OTP\Notifications\WcSMSNotification\Helper\WooCommercePremiumTags;
use OTP\Helper\AddOnList;
use OTP\Helper\MoMessages;
use OTP\Objects\AddOnInterface;
use OTP\Objects\BaseAddOn;
use OTP\Traits\Instance;
use OTP\Helper\MoUtility;

require 'wcautoload.php';

/**
 * This class is used to initialize all the Handlers, Helpers, Controllers,
 * Styles and Scripts of the addon.
 */
if ( ! class_exists( 'WooCommerceSmsNotification' ) ) {
	/**
	 * WooCommerceSmsNotification class
	 */
	final class WooCommerceSmsNotification extends BaseAddon implements AddOnInterface {

		use Instance;

		/** Declare Default variables */
		public function __construct() {
			parent::__construct();
			add_action( 'admin_enqueue_scripts', array( $this, 'mo_sms_notif_settings_script' ) );
			add_action( 'mo_otp_verification_delete_addon_options', array( $this, 'mo_sms_notif_delete_options' ) );
		}


		/**
		 * This function is called to append our CSS file
		 * in the backend and frontend. Uses the admin_enqueue_scripts
		 * and enqueue_scripts WordPress hook.
		 */
		public function mo_sms_notif_settings_script() {
			if ( ! function_exists( 'current_user_can' ) || ! current_user_can( 'manage_options' ) ) {
				return;
			}

			wp_register_script( 'mo_custom_order_sms', WC_MSN_JS_URL, array( 'jquery' ), MSN_VERSION, false );

			// Generate nonce and intl-tel-input utils URL for use in JavaScript.
			$nonce     = wp_create_nonce( 'mo_custom_order_sms_nonce' );
			$utils_url = add_query_arg(
				array(
					'action' => 'mo_get_intl_tel_utils',
					'nonce'  => $nonce,
				),
				admin_url( 'admin-ajax.php' )
			);

			wp_localize_script(
				'mo_custom_order_sms',
				'mocustommsg',
				array(
					'siteURL'     => admin_url( 'admin-ajax.php' ),
					'nonce'       => $nonce,
					'telUtilsUrl' => esc_url_raw( $utils_url ),
				)
			);
			wp_enqueue_script( 'mo_custom_order_sms' );
		}

		/**
		 * Initialize all handlers associated with the addon
		 */
		public function initialize_handlers() {
			/** Initialize instance for addon list handler
			 *
			 *  @var AddOnList $list
			 */
			$list = AddOnList::instance();
			/** Initialize instance for Woocommerce Notifications handler
			 *
			 *  @var WooCommerceNotifications $handler
			 */
			$handler = WooCommerceNotifications::instance();
		}

		/**
		 * Initialize all helper associated with the addon
		 */
		public function initialize_helpers() {
			MoWcAddOnMessages::instance();

			if ( ! MoUtility::mo_require_file( MOV_DIR . 'notifications/wcsmsnotification/helper/class-woocommercepremiumtags.php', MOV_DIR ) ) {
				return;
			}
			require MOV_DIR . 'notifications/wcsmsnotification/helper/class-woocommercepremiumtags.php';
			WooCommercePremiumTags::instance();
		}


		/**
		 * This function hooks into the mo_otp_verification_add_on_controller
		 * hook to show woocommerce notification settings page and forms for
		 * validation.
		 *
		 * @todo change addon framework to notification framework
		 */
		public function show_addon_settings_page() {
		}


		/**
		 * Function is called during deletion of the plugin to delete any options
		 * related to the add-on. This function hooks into the 'mo_otp_verification_delete_addon_options'
		 * hook of the OTP verification plugin.
		 */
		public function mo_sms_notif_delete_options() {
			if ( ! function_exists( 'current_user_can' ) || ! current_user_can( 'manage_options' ) ) {
				return;
			}
			delete_site_option( 'mo_wc_sms_notification_settings' );
		}
	}
}
