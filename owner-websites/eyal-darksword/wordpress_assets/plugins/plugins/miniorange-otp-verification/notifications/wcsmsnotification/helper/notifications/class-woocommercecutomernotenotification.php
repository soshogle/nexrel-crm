<?php
/**
 * Helper functions for Woocommerce Customer Note Notification
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
use OTP\Helper\MoUtility;
use OTP\Objects\SMSNotification;

/**
 * This class is used to handle all the settings and function related
 * to the WooCommerce Customer Note Notification. It initializes the
 * notification related to settings and implements the functionality
 * for sending the SMS to the user.
 */
if ( ! class_exists( 'WooCommerceCutomerNoteNotification' ) ) {
	/**
	 * WooCommerceCutomerNoteNotification class
	 */
	class WooCommerceCutomerNoteNotification extends SMSNotification {

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
		 * This function is used to get the instance of the WooCommerceCutomerNoteNotification class.
		 *
		 * @param array $config Configuration array.
		 * @return WooCommerceCutomerNoteNotification Object containing the instance of the class.
		 */
		public static function mo_otp_get_instance( $config = null ) {

			if ( null === self::$instance ) {

				self::$instance = new self();

				// Default Customer Note SMS message.
				$default_sms_message = MoWcAddOnMessages::showMessage(
					MoWcAddOnMessages::CUSTOMER_NOTE_SMS
				);

				// Default configuration.
				$default_config = array(
					'title'             => 'Customer Note',
					'page'              => 'wc_customer_note_notif',
					'is_enabled'        => false,

					'tool_tip_header'   => 'CUSTOMER_NOTE_NOTIF_HEADER',
					'tool_tip_body'     => 'CUSTOMER_NOTE_NOTIF_BODY',

					'recipient'         => 'customer',

					'sms_body'          => $default_sms_message,
					'default_sms_body'  => $default_sms_message,

					'premium_tags'      => '{payment-method},{total-Amount},{transaction-ID},{order-key},'
						. '{billing-firstName},{billing-phone},{billing-email},{billing-address},{billing-city},'
						. '{billing-state},{billing-postcode},{billing-country},{shipping-firstName},{shipping-phone},'
						. '{shipping-address},{shipping-city},{shipping-state},{shipping-postcode},{shipping-country}',

					'available_tags'    => '{site-name},{order-number},{username},{order-date}',

					'page_header'       => __( 'CUSTOMER NOTE NOTIFICATION SETTINGS', 'miniorange-otp-verification' ),
					'page_description'  => __( 'SMS notifications settings for Customer Note SMS sent to the users', 'miniorange-otp-verification' ),
					'notification_type' => __( 'Customer', 'miniorange-otp-verification' ),

					'sms_tags'          => '{username};{order-number};{site-name};{order-date}',
					'template_name'     => null,
				);

				// Merge provided configuration with defaults.
				$final_config = $config ? (array) $config : array();
				$final_config = array_merge( $default_config, $final_config );

				// Apply config to class properties dynamically.
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
			if ( ! isset( $args['orderDetails'] ) ) {
				return;
			}

			$order_details = $args['orderDetails'];

			// Validate order object.
			if ( ! is_a( $order_details, 'WC_Order' ) ) {
				return;
			}

			$this->set_notif_in_session( $this->page );

			$customer_id  = $order_details->get_customer_id();
			$userdetails  = $customer_id ? get_userdata( $customer_id ) : null;
			$site_name    = get_bloginfo();
			$username     = ( $userdetails && ! is_wp_error( $userdetails ) ) ? $userdetails->user_login : '';
			$phone_number = MoWcAddOnUtility::get_customer_number_from_order( $order_details );

			$date_created = $order_details->get_date_created();
			$date_string  = $date_created ? $date_created->date_i18n() : '';
			$order_no     = $order_details->get_order_number();

			$replaced_string = array(
				'site-name'    => sanitize_text_field( wp_unslash( $site_name ) ),
				'username'     => sanitize_text_field( wp_unslash( $username ) ),
				'order-date'   => sanitize_text_field( wp_unslash( $date_string ) ),
				'order-number' => sanitize_text_field( wp_unslash( $order_no ) ),
			);

			/* WooCommerce Premium Tags */
			$replaced_string = apply_filters( 'mo_premium_tags', $replaced_string, $args ); // hook call which will store the all the premium Tags.

			$replaced_string = apply_filters( 'mo_wc_customer_note_string_replace', $replaced_string );
			$sms_body        = MoUtility::replace_string( $replaced_string, $this->sms_body );
			$sms_tags        = MoUtility::replace_string( $replaced_string, $this->sms_tags );

			$phone_number = MoUtility::process_phone_number( $phone_number );
			if ( empty( $phone_number ) ) {
				return;
			}

			if ( MoUtility::mo_is_whatsapp_notif_enabled() ) {
				MoUtility::mo_send_whatsapp_notif( $phone_number, $this->template_name, $sms_tags, 'CUSTOMER_NOTE' );
			} else {
				MoUtility::send_phone_notif( $phone_number, $sms_body, 'CUSTOMER_NOTE' );
			}
		}
	}
}
