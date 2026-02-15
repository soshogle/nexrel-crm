<?php
/**
 * AddOn Name: Ultimate Member SMS Notification
 * Plugin URI: http://miniorange.com
 * Description: Send out SMS notifications to admins and users.
 * Version: 1.0.0
 * Author: miniOrange
 * Author URI: http://miniorange.com
 * Text Domain: miniorange-otp-verification
 * License: MIT Expat
 *
 * @package miniorange-otp-verification/Notifications/umsmsnotification
 */

namespace OTP\Notifications\UmSMSNotification;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

use OTP\Notifications\UmSMSNotification\Handler\UltimateMemberSMSNotificationsHandler;
use OTP\Notifications\UmSMSNotification\Helper\UltimateMemberSMSNotificationMessages;
use OTP\Helper\AddOnList;
use OTP\Helper\MoMessages;
use OTP\Helper\MoUtility;
use OTP\Objects\AddOnInterface;
use OTP\Objects\BaseAddOn;
use OTP\Traits\Instance;

$base_dir      = plugin_dir_path( __FILE__ );
$autoload_file = $base_dir . 'umautoload.php';

if ( ! MoUtility::mo_require_file( $autoload_file, $base_dir ) ) {
	return;
}
require_once $autoload_file;
$base_dir = realpath( UMSN_DIR );

/**
 * This is the constant class which consists of the necessary function used in the addon.
 */
if ( ! class_exists( 'UltimateMemberSmsNotification' ) ) {
	/**
	 * UltimateMemberSmsNotification class
	 */
	final class UltimateMemberSmsNotification extends BaseAddon implements AddOnInterface {

		use Instance;

		/**
		 * Initializes values
		 */
		public function __construct() {
			parent::__construct();
			add_action( 'mo_otp_verification_delete_addon_options', array( $this, 'um_sms_notif_delete_options' ) );
		}

		/**
		 * Initialize all handlers associated with the addon
		 */
		public function initialize_handlers() {
			$list = AddOnList::instance();

			$handler = UltimateMemberSMSNotificationsHandler::instance();
		}

		/**
		 * Initialize all helper associated with the addon
		 */
		public function initialize_helpers() {
			UltimateMemberSMSNotificationMessages::instance();
		}


		/**
		 * This function hooks into the mo_otp_verification_add_on_controller
		 * hook to show ultimate notification settings page and forms for
		 * validation.
		 *
		 * @todo change the addon framework to notifications framework
		 */
		public function show_addon_settings_page() {
		}

		/**
		 * Function is called during deletion of the plugin to delete any options
		 * related to the add-on. This function hooks into the 'mo_otp_verification_delete_addon_options'
		 * hook of the OTP verification plugin.
		 */
		public function um_sms_notif_delete_options() {
			if ( ! function_exists( 'current_user_can' ) || ! current_user_can( 'manage_options' ) ) {
				return;
			}
			delete_site_option( 'mo_um_sms_notification_settings' );
		}
	}
}
