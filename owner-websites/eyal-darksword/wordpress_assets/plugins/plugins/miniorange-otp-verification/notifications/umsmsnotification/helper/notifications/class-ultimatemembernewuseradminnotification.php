<?php
/**
 * Ultimate Member New Customer Notifications helper
 *
 * @package miniorange-otp-verification/Notifications/umsmsnotification/helper/notifications
 */

namespace OTP\Notifications\UmSMSNotification\Helper\Notifications;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

use OTP\Notifications\UmSMSNotification\Helper\UltimateMemberSMSNotificationMessages;
use OTP\Notifications\UmSMSNotification\Helper\UltimateMemberSMSNotificationUtility;
use OTP\Helper\MoUtility;
use OTP\Helper\MoMessages;
use OTP\Objects\SMSNotification;

/**
 * This class is used to handle all the settings and function related
 * to the UltimateMember New User Admin SMS Notification. It initializes the
 * notification related settings and implements the functionality for
 * sending the SMS to the user.
 */
if ( ! class_exists( 'UltimateMemberNewUserAdminNotification' ) ) {
	/**
	 * UltimateMemberNewUserAdminNotification class
	 */
	class UltimateMemberNewUserAdminNotification extends SMSNotification {

		/**
		 * Instance.
		 *
		 * @var mixed $insatance Instance.
		 */
		public static $instance;

		/**
		 * This function is used to get the instance of the UltimateMemberNewUserAdminNotification class.
		 *
		 * @param array $config Configuration array.
		 * @return UltimateMemberNewUserAdminNotification Object containing the instance of the class.
		 */
		public static function mo_otp_get_instance( $config = null ) {
			if ( null === self::$instance ) {
				self::$instance = new self();

				// Get default SMS message once for better performance.
				$default_sms_message = UltimateMemberSMSNotificationMessages::showMessage(
					UltimateMemberSMSNotificationMessages::NEW_UM_CUSTOMER_ADMIN_SMS
				);

				// Define default configuration.
				$default_config = array(
					'title'             => 'New Account',
					'page'              => 'um_new_user_admin_notif',
					'is_enabled'        => false,
					'tool_tip_header'   => 'NEW_UM_CUSTOMER_NOTIF_HEADER',
					'tool_tip_body'     => 'NEW_UM_CUSTOMER_ADMIN_NOTIF_BODY',
					'recipient'         => UltimateMemberSMSNotificationUtility::get_admin_phone_number(),
					'sms_body'          => $default_sms_message,
					'default_sms_body'  => $default_sms_message,
					'available_tags'    => '{site-name},{username},{email},{fullname}',
					'page_header'       => __( 'NEW ACCOUNT ADMIN NOTIFICATION SETTINGS', 'miniorange-otp-verification' ),
					'page_description'  => __( 'SMS notifications settings for New Account creation SMS sent to the admins', 'miniorange-otp-verification' ),
					'notification_type' => __( 'Administrator', 'miniorange-otp-verification' ),
				);

				// Merge provided config with defaults.
				$final_config = $config ? (array) $config : array();
				$final_config = array_merge( $default_config, $final_config );

				// Apply configuration to instance properties.
				foreach ( $final_config as $property => $value ) {
					if ( property_exists( self::$instance, $property ) ) {
						self::$instance->$property = $value;
					}
				}
			}

			return self::$instance;
		}

		/**
		 * Initialize all the variables required to modify the sms template
		 * and send the SMS to the user. Checks if the SMS notification
		 * has been enabled and send SMS to the user. Do not send SMS
		 * if phone number of the customer doesn't exist.
		 *
		 * @param  array $args all the arguments required to send SMS.
		 */
		public function send_sms( array $args ) {

			if ( ! $this->is_enabled ) {
				return;
			}
			$this->set_notif_in_session( $this->page );

			$phone_numbers = array();
			if ( is_string( $this->recipient ) ) {
				$unserialized = maybe_unserialize( $this->recipient );
				if ( is_array( $unserialized ) ) {
					$phone_numbers = $unserialized;
				} elseif ( is_string( $unserialized ) ) {
					$phone_numbers = explode( ';', $unserialized );
				}
			} elseif ( is_array( $this->recipient ) ) {
				$phone_numbers = $this->recipient;
			}

			$username    = um_user( 'user_login' );
			$profile_url = um_user_profile_url();
			$full_name   = um_user( 'full_name' );
			$email       = um_user( 'user_email' );

			$replaced_string = array(
				'site-name'       => get_bloginfo(),
				'username'        => $username,
				'accountpage-url' => $profile_url,
				'fullname'        => $full_name,
				'email'           => $email,
			);
			$replaced_string = apply_filters( 'mo_um_new_customer_admin_notif_string_replace', $replaced_string );
			$sms_body        = MoUtility::replace_string( $replaced_string, $this->sms_body );

			if ( MoUtility::is_blank( $phone_numbers ) ) {
				return;
			}
			foreach ( $phone_numbers as $phone_number ) {
				MoUtility::send_phone_notif( $phone_number, $sms_body, 'NEW_ACCOUNT_ADMIN' );
			}
		}
	}
}
