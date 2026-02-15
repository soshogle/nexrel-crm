<?php
/**
 * Utility functions for Woocommerce Notifications
 *
 * @package miniorange-otp-verification/Notifications/wcsmsnotification/helper
 */

namespace OTP\Notifications\WcSMSNotification\Helper;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

use OTP\Helper\MoMessages;
use OTP\Helper\MoUtility;
use WC_Order;
use OTP\Notifications\WcSMSNotification\Helper\WooCommerceNotificationsList;

/**
 * This class is used to define some plugin wide utility
 * functions. The functions described here are all static
 * in nature so that it's accessible without an instance.
 */
if ( ! class_exists( 'MoWcAddOnUtility' ) ) {
	/**
	 * MoWcAddOnUtility class
	 */
	class MoWcAddOnUtility {

		/**
		 * Get the Phone of the first Admin user. This is used as
		 * the recipient of the admin SMS notifications if no
		 * phone number is saved for the notification.
		 *
		 * @return string
		 */
		public static function mo_get_admin_phone_number() {

			$notification_settings = get_wc_option( 'notification_settings_option' );

			// Normalize to expected object.
			if ( is_string( $notification_settings ) && is_serialized( $notification_settings ) ) {
				$notification_settings = maybe_unserialize( $notification_settings );
			}
			if ( is_object( $notification_settings ) && method_exists( $notification_settings, 'get_wc_admin_order_status_notif' ) ) {
				$sms_settings    = $notification_settings->get_wc_admin_order_status_notif();
				$recipient_value = maybe_unserialize( $sms_settings->recipient );
				return ! empty( $recipient_value ) ? $recipient_value : '';
			} else {
				return '';
			}
		}

		/**
		 * Get the billing phone number of Customer. If the billing number is not set
		 * with the order, pick the number from registered phone number.
		 *
		 * @param WC_Order $order   - Order details, WooCommerce Order Object.
		 * @return string
		 */
		public static function get_customer_number_from_order( $order ) {

			// Validate order parameter.
			if ( ! $order || ! is_a( $order, 'WC_Order' ) ) {
				return '';
			}

			// Get user ID with validation.
			$user_id = $order->get_user_id();
			if ( ! is_numeric( $user_id ) || $user_id <= 0 ) {
				$user_id = 0;
			}

			// Get billing phone with validation.
			$phone = $order->get_billing_phone();
			$phone = MoUtility::process_phone_number( $phone );

			// If no billing phone, try to get from user meta.
			if ( empty( $phone ) && $user_id > 0 ) {
				$user_phone = get_user_meta( $user_id, 'billing_phone', true );
				$phone      = MoUtility::process_phone_number( $user_phone );
			}

			return ! empty( $phone ) ? $phone : '';
		}

		/**
		 * Checks if the customer is registered or not and shows a message on the page
		 * to the user so that they can register or login themselves to use the plugin.
		 */
		public static function mo_is_addon_activated() {

			// Validate MoUtility class exists and method exists.
			if ( ! class_exists( 'OTP\Helper\MoUtility' ) || ! method_exists( 'OTP\Helper\MoUtility', 'is_addon_activated' ) ) {
				return;
			}

			MoUtility::is_addon_activated();
		}
	}
}
