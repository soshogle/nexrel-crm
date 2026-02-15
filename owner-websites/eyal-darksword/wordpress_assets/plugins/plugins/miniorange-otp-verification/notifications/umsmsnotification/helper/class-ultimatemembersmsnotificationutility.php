<?php
/**
 * Ultimate Member SMS Notification Utility
 *
 * @package miniorange-otp-verification/Notifications/umsmsnotification/helper
 */

namespace OTP\Notifications\UmSMSNotification\Helper;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

use OTP\Helper\MoUtility;
use OTP\Helper\MoMessages;

/**
 * This class is used to define some plugin wide utility
 * functions. The functions described here are all static
 * in nature so that it's accessible without an instance.
 */
if ( ! class_exists( 'UltimateMemberSMSNotificationUtility' ) ) {
	/**
	 * UltimateMemberSMSNotificationUtility class
	 */
	class UltimateMemberSMSNotificationUtility {

		/**
		 * Get the Phone of the first Admin user. This is used as
		 * the recipient of the admin SMS notifications if no
		 * phone number is saved for the notification.
		 *
		 * @return string
		 */
		public static function get_admin_phone_number() {
			if ( ! function_exists( 'get_umsn_option' ) ) {
				return '';
			}
			$recipient_value       = '';
			$notification_settings = get_umsn_option( 'notification_settings_option' );
			if ( $notification_settings ) {
				$sms_settings = $notification_settings->get_um_new_user_admin_notif();
				if ( isset( $sms_settings->recipient ) && is_string( $sms_settings->recipient ) ) {
					$unserialized = maybe_unserialize( $sms_settings->recipient );
					if ( is_string( $unserialized ) || is_array( $unserialized ) ) {
						$recipient_value = $unserialized;
					}
				}
			}
			return ! empty( $recipient_value ) ? $recipient_value : '';
		}
	}
}
