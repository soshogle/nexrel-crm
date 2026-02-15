<?php
/**
 * Contains all the messages used in Ultimate Member SMS Notifications
 *
 * @package miniorange-otp-verification/Notifications/umsmsnotification/helper
 */

namespace OTP\Notifications\UmSMSNotification\Helper;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

use OTP\Helper\MoUtility;
use OTP\Helper\MoMessages;
use OTP\Objects\BaseMessages;
use OTP\Traits\Instance;

/**
 * This is the constant class which lists all the messages
 * to be shown in the plugin.
 */
if ( ! class_exists( 'UltimateMemberSMSNotificationMessages' ) ) {
	/**
	 * UltimateMemberSMSNotificationMessages class
	 */
	final class UltimateMemberSMSNotificationMessages extends BaseMessages {

		use Instance;

		/**
		 * This function is used to get the UM addon messages.
		 *
		 * @return string
		 */
		public static function get_um_addon_messages() {
			$um_addon_messages = maybe_serialize(
				array(
					self::NEW_UM_CUSTOMER_NOTIF_HEADER     => __( 'NEW ACCOUNT NOTIFICATION', 'miniorange-otp-verification' ),
					self::NEW_UM_CUSTOMER_NOTIF_BODY       => __( 'Customers are sent a new account SMS notification when they sign up on the site.', 'miniorange-otp-verification' ),
					self::NEW_UM_CUSTOMER_SMS              => __( 'Thanks for creating an account on {site-name}. Your username is {username} -miniorange', 'miniorange-otp-verification' ),
					self::NEW_UM_CUSTOMER_ADMIN_NOTIF_BODY => __( 'Admins are sent a new account SMS notification when a user signs up on the site.', 'miniorange-otp-verification' ),
					self::NEW_UM_CUSTOMER_ADMIN_SMS        => __( 'New User Created on {site-name}. Username: {username} -miniorange', 'miniorange-otp-verification' ),
				)
			);
			return $um_addon_messages;
		}


		/**
		 * This function is used to fetch and process the Messages to
		 * be shown to the user. It was created to mostly show dynamic
		 * messages to the user.
		 *
		 * @param string $message_keys   message key or keys.
		 * @param array  $data           key value of the data to be replaced in the message.
		 * @return string
		 */
		public static function showMessage( $message_keys, $data = array() ) {
			$display_message = '';
			$message_keys    = explode( ' ', $message_keys );

			$messages     = array();
			$unserialized = maybe_unserialize( self::get_um_addon_messages() );
			if ( is_array( $unserialized ) ) {
				$messages = $unserialized;
			}

			$common_messages = array();
			if ( defined( 'MO_MESSAGES' ) && is_string( MO_MESSAGES ) ) {
				$unserialized = maybe_unserialize( MO_MESSAGES );
				if ( is_array( $unserialized ) ) {
					$common_messages = $unserialized;
				}
			}

			$messages = array_merge( $messages, $common_messages );
			foreach ( $message_keys as $message_key ) {
				if ( MoUtility::is_blank( $message_key ) ) {
					return $display_message;
				}
				$format_message = isset( $messages[ $message_key ] ) ? $messages[ $message_key ] : '';
				foreach ( $data as $key => $value ) {
					$format_message = str_replace( '{{' . $key . '}}', $value, $format_message );
				}
				$display_message .= $format_message;
			}
			return $display_message;
		}
	}
}
