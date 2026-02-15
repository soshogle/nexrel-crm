<?php
/**
 * Ultimate Member Notifications List
 *
 * @package miniorange-otp-verification/Notifications/umsmsnotification/helper
 */

namespace OTP\Notifications\UmSMSNotification\Helper;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

use OTP\Notifications\UmSMSNotification\Helper\Notifications\UltimateMemberNewCustomerNotification;
use OTP\Notifications\UmSMSNotification\Helper\Notifications\UltimateMemberNewUserAdminNotification;
use OTP\Helper\MoMessages;
use OTP\Traits\Instance;

/**
 * This class is used to list down all the Ultimate Member  Notifications and initialize
 * each of the Notification classes so that it's accessible plugin wide. This
 * class is basically used to handle all the specific Ultimate Member  Notification classes.
 */
if ( ! class_exists( 'UltimateMemberNotificationsList' ) ) {
	/**
	 * UltimateMemberNotificationsList class
	 */
	class UltimateMemberNotificationsList {

		/**
		 * New customer notification class
		 *
		 * @var UltimateMemberNewCustomerNotification
		 */
		public $um_new_customer_notif;

		/**
		 * New User Admin Notification
		 *
		 * @var UltimateMemberNewUserAdminNotification
		 */
		public $um_new_user_admin_notif;

		use Instance;

		/**
		 * This function is used to get the instance of the UltimateMemberNotificationsList class.
		 * It checks if there exists an existing instance of the class.
		 * If not then creates an instance and returns it.
		 *
		 * @return UltimateMemberNotificationsList Object containing both notification instances.
		 */
		public static function mo_otp_get_instance() {
			return (object) array(
				'um_new_customer_notif'   => UltimateMemberNewCustomerNotification::mo_otp_get_instance(),
				'um_new_user_admin_notif' => UltimateMemberNewUserAdminNotification::mo_otp_get_instance(),
			);
		}


		/**
		 * Getter function of the $um_new_customer_notif. Returns the instance
		 * of the UltimateMemberNewCustomerNotification class.
		 *
		 * @return UltimateMemberNewCustomerNotification Object containing the instance of the class.
		 */
		public static function get_um_new_customer_notif() {
			return UltimateMemberNewCustomerNotification::mo_otp_get_instance();
		}


		/**
		 * Getter function of the $um_new_user_admin_notif. Returns the instance
		 * of the UltimateMemberNewUserAdminNotification class.
		 *
		 * @return UltimateMemberNewUserAdminNotification Object containing the instance of the class.
		 */
		public static function get_um_new_user_admin_notif() {
			return UltimateMemberNewUserAdminNotification::mo_otp_get_instance();
		}
	}
}
