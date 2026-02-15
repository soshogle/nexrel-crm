<?php
/**
 * Helper functions for Woocommerce New Customer Notifications
 *
 * @package miniorange-otp-verification/Notifications/wcsmsnotification/helper/notifications
 */

namespace OTP\Notifications\WcSMSNotification\Helper\Notifications;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

use OTP\Helper\MoMessages;
use OTP\Notifications\WcSMSNotification\Helper\MoWcAddOnMessages;
use OTP\Helper\MoUtility;
use OTP\Objects\SMSNotification;

/**
 * This class is used to handle all the settings and function related
 * to the WooCommerce New Customer SMS Notification. It initializes the
 * notification related settings and implements the functionality for
 * sending the SMS to the user.
 */
if ( ! class_exists( 'WooCommerceNewCustomerNotification' ) ) {
	/**
	 * WooCommerceNewCustomerNotification class
	 */
	class WooCommerceNewCustomerNotification extends SMSNotification {

		/** Global Variable
		 *
		 * @var instance - initiates the instance of the file.
		 */
		public static $instance;

		/**
		 * Woocommerce premium tags.
		 *
		 * @var array
		 */
		public $premium_tags;

		/**
		 * This function is used to get the instance of the WooCommerceNewCustomerNotification class.
		 *
		 * @param array $config Configuration array.
		 * @return WooCommerceNewCustomerNotification Object containing the instance of the class.
		 */
		public static function mo_otp_get_instance( $config = null ) {

			if ( null === self::$instance ) {

				self::$instance = new self();

				// Determine default SMS message based on WooCommerce password settings.
				$wc_pass_gen_enabled = ( get_wc_option( 'woocommerce_registration_generate_password', '' ) === 'yes' );

				$default_sms_message = $wc_pass_gen_enabled
					? MoWcAddOnMessages::showMessage( MoWcAddOnMessages::NEW_CUSTOMER_SMS_WITH_PASS )
					: MoWcAddOnMessages::showMessage( MoWcAddOnMessages::NEW_CUSTOMER_SMS );

				// Default configuration.
				$default_config = array(
					'title'             => 'New Account',
					'page'              => 'wc_new_customer_notif',
					'is_enabled'        => false,
					'tool_tip_header'   => 'NEW_CUSTOMER_NOTIF_HEADER',
					'tool_tip_body'     => 'NEW_CUSTOMER_NOTIF_BODY',
					'recipient'         => 'customer',

					// SMS body defaults.
					'sms_body'          => $default_sms_message,
					'default_sms_body'  => $default_sms_message,

					'premium_tags'      => '{user-email},{registration-date},{accountpage-url}',
					'available_tags'    => '{site-name},{username}',

					'page_header'       => __( 'NEW ACCOUNT NOTIFICATION SETTINGS', 'miniorange-otp-verification' ),
					'page_description'  => __( 'SMS notifications settings for New Account creation SMS sent to the users', 'miniorange-otp-verification' ),
					'notification_type' => __( 'Customer', 'miniorange-otp-verification' ),

					'sms_tags'          => '{username};{site-name};{accountpage-url}',
					'template_name'     => null,
				);

				// Merge provided config with defaults.
				$final_config = $config ? (array) $config : array();
				$final_config = array_merge( $default_config, $final_config );

				// Assign config values to instance dynamically.
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

			// Input validation for required arguments.
			if ( ! isset( $args['customer_id'] ) ) {
				return;
			}

			$this->set_notif_in_session( $this->page );

			$customer_id   = absint( $args['customer_id'] );
			$customer_data = isset( $args['new_customer_data'] ) && is_array( $args['new_customer_data'] ) ? $args['new_customer_data'] : array();

			// Validate customer ID.
			if ( empty( $customer_id ) ) {
				return;
			}

			$userdata = get_userdata( $customer_id );
			if ( ! $userdata || is_wp_error( $userdata ) ) {
				return;
			}

			$site_name    = get_bloginfo();
			$username     = $userdata->user_login;
			$phone_number = get_user_meta( $customer_id, 'billing_phone', true );

			// Enhanced input validation for phone number from POST data.
			$posted_phone_number = '';
			if ( ! empty( $_POST ) && isset( $_POST['billing_phone'] ) ) {
				if ( isset( $_POST['woocommerce-register-nonce'] ) && ! wp_verify_nonce( sanitize_key( wp_unslash( $_POST['woocommerce-register-nonce'] ) ), 'woocommerce-register' ) ) {
					$posted_phone_number = '';
				} else {
					$posted_phone_number = sanitize_text_field( wp_unslash( $_POST['billing_phone'] ) );
				}
			}

			$phone_number = empty( $phone_number ) && ! empty( $posted_phone_number ) ? $posted_phone_number : $phone_number;
			$phone_number = MoUtility::process_phone_number( $phone_number );

			$accountpage = wc_get_page_permalink( 'myaccount' );

			$replaced_string = array(
				'site-name'       => sanitize_text_field( wp_unslash( $site_name ) ),
				'username'        => sanitize_text_field( wp_unslash( $username ) ),
				'accountpage-url' => esc_url_raw( $accountpage ),
			);

			/* WooCommerce Premium Tags */
			$replaced_string = apply_filters( 'new_customer', $replaced_string, $args ); // hook call which will store the all the premium Tags.

			$replaced_string = apply_filters( 'mo_wc_new_customer_notif_string_replace', $replaced_string );
			$sms_body        = MoUtility::replace_string( $replaced_string, $this->sms_body );
			$sms_tags        = MoUtility::replace_string( $replaced_string, $this->sms_tags );

			if ( empty( $phone_number ) ) {
				return;
			}

			if ( MoUtility::mo_is_whatsapp_notif_enabled() ) {
				MoUtility::mo_send_whatsapp_notif( $phone_number, $this->template_name, $sms_tags, 'NEW_ACCOUNT' );
			} else {
				MoUtility::send_phone_notif( $phone_number, $sms_body, 'NEW_ACCOUNT' );
			}
		}
	}
}
