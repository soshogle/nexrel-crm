<?php
/**
 * Helper functions for Woocommerce Admin Order Notifications
 *
 * @package miniorange-otp-verification/Notifications/wcsmsnotification/helper/notifications
 */

namespace OTP\Notifications\WcSMSNotification\Helper\Notifications;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

use OTP\Helper\MoMessages;
use OTP\Notifications\WcSMSNotification\Helper\MoWcAddOnMessages;
use OTP\Notifications\WcSMSNotification\Helper\MoWcAddOnUtility;
use OTP\Notifications\WcSMSNotification\Helper\WcOrderStatus;
use OTP\Helper\MoUtility;
use OTP\Objects\SMSNotification;

/**
 * This class is used to handle all the settings and function related
 * to the WooCommerce Admin Order Status SMS Notification. It initializes the
 * notification related settings and implements the functionality for
 * sending the SMS to the user.
 */
if ( ! class_exists( 'WooCommerceAdminOrderstatusNotification' ) ) {
	/**
	 * WooCommerceAdminOrderstatusNotification class
	 */
	class WooCommerceAdminOrderstatusNotification extends SMSNotification {

		/** Global Variable
		 *
		 * @var instance - initiates the instance of the file.
		 */
		public static $instance;
		/** Global Variable
		 *
		 * @var array statuses - defines the order status.
		 */
		public static $statuses;
		/**
		 * Woocommerce premium tags.
		 *
		 * @var array
		 */
		public $premium_tags;

		/**
		 * This function is used to get the instance of the WooCommerceAdminOrderstatusNotification class.
		 *
		 * @param array $config Configuration array.
		 * @return WooCommerceAdminOrderstatusNotification Object containing the instance of the class.
		 */
		public static function mo_otp_get_instance( $config = null ) {

			if ( null === self::$instance ) {

				self::$instance = new self();

				// Default SMS message for admin order status updates.
				$default_sms_message = MoWcAddOnMessages::showMessage(
					MoWcAddOnMessages::ADMIN_STATUS_SMS
				);

				// Default configuration.
				$default_config = array(
					'title'             => 'Order Status',
					'page'              => 'wc_admin_order_status_notif',
					'is_enabled'        => false,
					'tool_tip_header'   => 'NEW_ORDER_NOTIF_HEADER',
					'tool_tip_body'     => 'NEW_ORDER_NOTIF_BODY',

					'recipient'         => MoWcAddOnUtility::mo_get_admin_phone_number(),

					'sms_body'          => $default_sms_message,
					'default_sms_body'  => $default_sms_message,

					'available_tags'    => '{site-name},{order-number},{order-status},{username},{order-date}',

					'premium_tags'      => '{payment-method},{total-Amount},{transaction-ID},{order-key},'
						. '{billing-firstName},{billing-phone},{billing-email},{billing-address},{billing-city},'
						. '{billing-state},{billing-postcode},{billing-country},{shipping-firstName},{shipping-phone},'
						. '{shipping-address},{shipping-city},{shipping-state},{shipping-postcode},{shipping-country}',

					'page_header'       => __( 'ORDER ADMIN STATUS NOTIFICATION SETTINGS', 'miniorange-otp-verification' ),
					'page_description'  => __( 'SMS notifications settings for Order Status SMS sent to the admins', 'miniorange-otp-verification' ),
					'notification_type' => __( 'Administrator', 'miniorange-otp-verification' ),

					'sms_tags'          => '{username};{order-number};{site-name};{order-date}',
					'template_name'     => null,
				);

				// Merge provided configuration.
				$final_config = $config ? (array) $config : array();
				$final_config = array_merge( $default_config, $final_config );

				// Assign config values.
				foreach ( $final_config as $property => $value ) {
					if ( property_exists( self::$instance, $property ) ) {
						self::$instance->$property = $value;
					}
				}

				// Load all WooCommerce order statuses.
				self::$statuses = WcOrderStatus::mo_get_all_status();
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
			if ( ! isset( $args['orderDetails'] ) || ! isset( $args['new_status'] ) ) {
				return;
			}

			$order_details = $args['orderDetails'];
			$new_status    = sanitize_text_field( wp_unslash( $args['new_status'] ) );

			// Validate order object.
			if ( ! is_a( $order_details, 'WC_Order' ) ) {
				return;
			}

			if ( empty( $new_status ) ) {
				return;
			}

			if ( ! in_array( $new_status, self::$statuses, true ) ) {
				return;
			}

			$this->set_notif_in_session( $this->page );

			$customer_id = $order_details->get_customer_id();
			$userdetails = $customer_id ? get_userdata( $customer_id ) : null;
			$site_name   = get_bloginfo();
			$username    = ( $userdetails && ! is_wp_error( $userdetails ) ) ? $userdetails->user_login : '';

			// Secure deserialization using WordPress's maybe_unserialize() function.
			$phone_numbers = '';
			if ( ! empty( $this->recipient ) ) {
				if ( is_serialized( $this->recipient ) ) {
					$unserialized_recipient = maybe_unserialize( $this->recipient );
					if ( is_array( $unserialized_recipient ) ) {
						$phone_numbers = MoUtility::mo_sanitize_array( $unserialized_recipient );
					} else {
						$phone_numbers = sanitize_text_field( wp_unslash( $unserialized_recipient ) );
					}
				} else {
					$phone_numbers = is_array( $this->recipient ) ? MoUtility::mo_sanitize_array( wp_unslash( $this->recipient ) ) : explode( ';', sanitize_text_field( wp_unslash( $this->recipient ) ) );
				}
			}

			$date_created = $order_details->get_date_created();
			$date_string  = $date_created ? $date_created->date_i18n() : '';
			$order_no     = $order_details->get_order_number();

			$replaced_string = array(
				'site-name'    => sanitize_text_field( wp_unslash( $site_name ) ),
				'username'     => sanitize_text_field( wp_unslash( $username ) ),
				'order-date'   => sanitize_text_field( wp_unslash( $date_string ) ),
				'order-number' => sanitize_text_field( wp_unslash( $order_no ) ),
				'order-status' => $new_status,
			);

			/* WooCommerce Premium Tags */
			$replaced_string = apply_filters( 'mo_premium_tags', $replaced_string, $args ); // allow premium tag injections consistently.

			$replaced_string = apply_filters( 'mo_wc_admin_order_notif_string_replace', $replaced_string );
			$sms_body        = MoUtility::replace_string( $replaced_string, $this->sms_body );
			$sms_tags        = MoUtility::replace_string( $replaced_string, $this->sms_tags );

			if ( empty( $phone_numbers ) ) {
				return;
			}

			// Ensure phone_numbers is always an array.
			if ( ! is_array( $phone_numbers ) ) {
				$phone_numbers = array( $phone_numbers );
			}

			foreach ( $phone_numbers as $phone_number ) {
				$phone_number = MoUtility::process_phone_number( $phone_number );
				if ( empty( $phone_number ) ) {
					continue;
				}

				if ( MoUtility::mo_is_whatsapp_notif_enabled() ) {
					MoUtility::mo_send_whatsapp_notif( $phone_number, $this->template_name, $sms_tags, 'ORDER_STATUS' );
				} else {
					MoUtility::send_phone_notif( $phone_number, $sms_body, 'ORDER_STATUS' );
				}
			}
		}
	}
}
