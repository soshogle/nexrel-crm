<?php
/**
 * Helper functions for Woocommerce Messages
 *
 * @package miniorange-otp-verification/Notifications/wcsmsnotification/helper
 */

namespace OTP\Notifications\WcSMSNotification\Helper;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

use OTP\Helper\MoMessages;
use OTP\Helper\MoUtility;
use OTP\Objects\BaseMessages;
use OTP\Traits\Instance;

/**
 * This is the constant class which lists all the messages
 * to be shown in the plugin.
 */
if ( ! class_exists( 'MoWcAddOnMessages' ) ) {
	/**
	 * MoWcAddOnMessages class
	 */
	final class MoWcAddOnMessages extends BaseMessages {

		/** Global Variable
		 *
		 * @var instance - initiates the instance of the file.
		 */
		use Instance;

		/**
		 * This function is used to get the WC addon messages.
		 *
		 * @return array
		 */
		private static function mo_get_wc_addon_messages() {
			// Secure array definition without unnecessary serialization.
			$messages_array = maybe_serialize(
				array(
					self::NEW_CUSTOMER_NOTIF_HEADER     => __( 'NEW ACCOUNT NOTIFICATION', 'miniorange-otp-verification' ),
					self::NEW_CUSTOMER_NOTIF_BODY       => __( 'Customers are sent a new account SMS notification when they sign up via checkout or account page.', 'miniorange-otp-verification' ),
					self::NEW_CUSTOMER_SMS_WITH_PASS    => __( 'Thanks for creating an account on {site-name}. Your username is {username} -miniorange', 'miniorange-otp-verification' ),
					self::NEW_CUSTOMER_SMS              => __( 'Thanks for creating an account on {site-name}. Your username is {username} -miniorange', 'miniorange-otp-verification' ),

					self::CUSTOMER_NOTE_NOTIF_HEADER    => __( 'CUSTOMER NOTE NOTIFICATION', 'miniorange-otp-verification' ),
					self::CUSTOMER_NOTE_NOTIF_BODY      => __( 'Customers are sent a new note SMS notification when the admin adds a customer note to one of their orders.', 'miniorange-otp-verification' ),
					self::CUSTOMER_NOTE_SMS             => __( 'Hi {username}, A note has been added to your order number {order-number} with {site-name} ordered on {order-date} -miniorange', 'miniorange-otp-verification' ),

					self::NEW_ORDER_NOTIF_HEADER        => __( 'ORDER STATUS NOTIFICATION', 'miniorange-otp-verification' ),
					self::NEW_ORDER_NOTIF_BODY          => __( 'Recipients will be sent a new SMS notification notifying that the status of an order has changed and they need to process it.', 'miniorange-otp-verification' ),
					self::ADMIN_STATUS_SMS              => __( '{username} placed an order with ID {order-number} on {order-date}. Status changed to {order-status}. Store:{site-name} -miniorange', 'miniorange-otp-verification' ),

					self::ORDER_ON_HOLD_NOTIF_HEADER    => __( 'ORDER ON HOLD NOTIFICATION', 'miniorange-otp-verification' ),
					self::ORDER_ON_HOLD_NOTIF_BODY      => __( 'Customer will be sent a new SMS notification notifying that the status of the order has changed to ON-HOLD.', 'miniorange-otp-verification' ),
					self::ORDER_ON_HOLD_SMS             => __( 'Hello {username}, your order id {order-number} with {site-name} ordered on {order-date} has been put on hold. -miniorange', 'miniorange-otp-verification' ),

					self::ORDER_PROCESSING_NOTIF_HEADER => __( 'PROCESSING ORDER NOTIFICATION', 'miniorange-otp-verification' ),
					self::ORDER_PROCESSING_NOTIF_BODY   => __( 'Customer will be sent a new SMS notification notifying that the order is currently under processing.', 'miniorange-otp-verification' ),
					self::PROCESSING_ORDER_SMS          => __( 'Hello {username}, your order id {order-number} with {site-name} ordered on {order-date} is processing. -miniorange', 'miniorange-otp-verification' ),

					self::ORDER_COMPLETED_NOTIF_HEADER  => __( 'ORDER COMPLETED NOTIFICATION', 'miniorange-otp-verification' ),
					self::ORDER_COMPLETED_NOTIF_BODY    => __( 'Customer will be sent a new SMS notification notifying that the order processing has been completed.', 'miniorange-otp-verification' ),
					self::ORDER_COMPLETED_SMS           => __( 'Hello {username}, your order id {order-number} with {site-name} ordered on {order-date} has been processed. It will be delivered shortly. -miniorange', 'miniorange-otp-verification' ),

					self::ORDER_REFUNDED_NOTIF_HEADER   => __( 'ORDER REFUNDED NOTIFICATION', 'miniorange-otp-verification' ),
					self::ORDER_REFUNDED_NOTIF_BODY     => __( 'Customer will be sent a new SMS notification notifying that the order has been refunded.', 'miniorange-otp-verification' ),
					self::ORDER_REFUNDED_SMS            => __( 'Hello {username}, your order id {order-number} with {site-name} ordered on {order-date} has been refunded. -miniorange', 'miniorange-otp-verification' ),

					self::ORDER_CANCELLED_NOTIF_HEADER  => __( 'ORDER CANCELLED NOTIFICATION', 'miniorange-otp-verification' ),
					self::ORDER_CANCELLED_NOTIF_BODY    => __( 'Customer will be sent a new SMS notification notifying that the order has been cancelled.', 'miniorange-otp-verification' ),
					self::ORDER_CANCELLED_SMS           => __( 'Hello {username}, your order id {order-number} with {site-name} ordered on {order-date} has been cancelled. -miniorange', 'miniorange-otp-verification' ),

					self::ORDER_FAILED_NOTIF_HEADER     => __( 'ORDER FAILED NOTIFICATION', 'miniorange-otp-verification' ),
					self::ORDER_FAILED_NOTIF_BODY       => __( 'Customer will be sent a new SMS notification notifying that the order processing has failed.', 'miniorange-otp-verification' ),
					self::ORDER_FAILED_SMS              => __( 'Hello {username}, your order id {order-number} with {site-name} ordered on {order-date} has failed. We will contact you shortly. -miniorange', 'miniorange-otp-verification' ),

					self::ORDER_PENDING_NOTIF_HEADER    => __( 'ORDER PENDING PAYMENT NOTIFICATION', 'miniorange-otp-verification' ),
					self::ORDER_PENDING_NOTIF_BODY      => __( 'Customer will be sent a new SMS notification notifying that the order is pending payment.', 'miniorange-otp-verification' ),
					self::ORDER_PENDING_SMS             => __( 'Hello {username}, your order id {order-number} with {site-name} ordered on {order-date} is pending payment. -miniorange', 'miniorange-otp-verification' ),
					self::PRODUCT_IS_IN_LOW_STOCK_NOTIF_HEADER => __( 'PRODUCT IS IN LOW STOCK NOTIFICATION', 'miniorange-otp-verification' ),
					self::PRODUCT_IS_IN_LOW_STOCK_NOTIF_BODY => __( 'Admin will get an SMS notification notifying stock is less.', 'miniorange-otp-verification' ),
					self::PRODUCT_IS_IN_LOW_STOCK_SMS   => __( 'Hello, your product {product-name} with product id {product_id}, is running low with current stock: {item-qty} - miniOrange.', 'miniorange-otp-verification' ),
					self::PRODUCT_IS_OUT_OF_STOCK_NOTIF_HEADER => __( 'PRODUCT IS OUT OF STOCK NOTIFICATION', 'miniorange-otp-verification' ),
					self::PRODUCT_IS_OUT_OF_STOCK_NOTIF_BODY => __( 'Admin will get an SMS notification notifying product is out of stock.', 'miniorange-otp-verification' ),
					self::PRODUCT_IS_OUT_OF_STOCK_SMS   => __( 'Hello, your product {product-name} with product id {product_id}, is out of stock with current stock: {item-qty} - miniOrange.', 'miniorange-otp-verification' ),
				)
			);
			return $messages_array;
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
			// Input validation for message keys.
			if ( empty( $message_keys ) || ! is_string( $message_keys ) ) {
				return '';
			}

			// Input validation for data parameter.
			if ( ! is_array( $data ) ) {
				$data = array();
			}

			$display_message = '';
			$message_keys    = explode( ' ', sanitize_text_field( wp_unslash( $message_keys ) ) );

			// Secure handling of constants with validation.
			$messages        = maybe_unserialize( self::mo_get_wc_addon_messages() );
			$common_messages = maybe_unserialize( MoMessages::update_message_list( MoMessages::mo_get_messages() ) );

			// Unwrap serialized MO_MESSAGES if needed using WordPress's maybe_unserialize() function.
			if ( is_string( $common_messages ) && function_exists( 'is_serialized' ) && is_serialized( $common_messages ) ) {
				$maybe = maybe_unserialize( $common_messages );
				if ( is_array( $maybe ) ) {
					$common_messages = $maybe;
				} else {
					$common_messages = array();
				}
			}

			// Validate that both are arrays before merging.
			if ( ! is_array( $messages ) ) {
				$messages = array();
			}
			if ( ! is_array( $common_messages ) ) {
				$common_messages = array();
			}

			$messages = array_merge( $messages, $common_messages );

			foreach ( $message_keys as $message_key ) {
				$message_key = sanitize_text_field( wp_unslash( trim( $message_key ) ) );
				if ( empty( $message_key ) ) {
					continue;
				}

				// Secure array access with validation.
				if ( ! isset( $messages[ $message_key ] ) ) {
					// Return a safe default message instead of causing an error.
					$display_message .= esc_html( MoMessages::showMessage( MoMessages::UNKNOWN_ERROR ) );
					continue;
				}

				$format_message = $messages[ $message_key ];

				// Validate format_message is a string.
				if ( ! is_string( $format_message ) ) {
					continue;
				}

				// Secure data replacement with sanitization.
				foreach ( $data as $key => $value ) {
					$key   = sanitize_text_field( wp_unslash( $key ) );
					$value = sanitize_text_field( wp_unslash( $value ) );
					if ( ! empty( $key ) ) {
						$format_message = str_replace( '{{' . $key . '}}', $value, $format_message );
					}
				}
				$display_message .= $format_message;
			}

			return $display_message;
		}
	}
}
