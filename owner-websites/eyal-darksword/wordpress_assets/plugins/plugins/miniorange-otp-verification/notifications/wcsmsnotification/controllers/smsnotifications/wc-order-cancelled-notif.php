<?php
/**
 * Load view for Customer Order Cancelled SMS Notification
 *
 * @package miniorange-otp-verification/Notifications/wcsmsnotification/controllers/smsnotifications
 */

namespace OTP\Notifications\WcSMSNotification\Controllers\SmsNotifications;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

use OTP\Helper\MoUtility;
use OTP\Helper\MoMessages;
use OTP\Notifications\WcSMSNotification\Helper\WooCommerceNotificationsList;

// Access control check - only administrators can access SMS notification settings.
if ( ! function_exists( 'current_user_can' ) || ! current_user_can( 'manage_options' ) ) {
	wp_die( esc_html( MoMessages::showMessage( MoMessages::UNKNOWN_ERROR ) ) );
}

$notification_settings = get_wc_option( 'notification_settings_option' );

// Secure deserialization with validation and PHP 5.6 compatibility.
if ( $notification_settings && is_serialized( $notification_settings ) ) {
	$notification_settings = maybe_unserialize( $notification_settings );
	// Validate that deserialization resulted in expected object type.
	if ( ! is_object( $notification_settings ) ) {
		$notification_settings = WooCommerceNotificationsList::mo_otp_get_instance();
	}
} else {
	$notification_settings = $notification_settings ? $notification_settings : WooCommerceNotificationsList::mo_otp_get_instance();
}

// Input validation for notification settings object.
if ( ! is_object( $notification_settings ) ) {
	wp_die( esc_html( MoMessages::showMessage( MoMessages::UNKNOWN_ERROR ) ) );
}

$sms_settings = $notification_settings->wc_order_cancelled_notif;

// Validate SMS settings object.
if ( ! is_object( $sms_settings ) ) {
	wp_die( esc_html( MoMessages::showMessage( MoMessages::UNKNOWN_ERROR ) ) );
}

// Validate and sanitize SMS settings properties.
$page_value = isset( $sms_settings->page ) ? sanitize_key( $sms_settings->page ) : '';
if ( empty( $page_value ) ) {
	wp_die( esc_html( MoMessages::showMessage( MoMessages::UNKNOWN_ERROR ) ) );
}

$enable_disable_tag = $page_value;
$textarea_tag       = $page_value . '_smsbody';
$variable_tag       = $page_value . '_sms_tags';
$template_name      = $page_value . '_template_name';
$recipient_tag      = $page_value . '_recipient';
$recipient_value    = isset( $sms_settings->recipient ) ? MoUtility::process_phone_number( (string) $sms_settings->recipient ) : '';
$enable_disable     = ( isset( $sms_settings->is_enabled ) && $sms_settings->is_enabled ) ? 'checked' : '';

// Secure file inclusion with path validation.
if ( defined( 'MSN_DIR' ) && ! empty( MSN_DIR ) ) {
	$template_file = realpath( MSN_DIR . '/views/smsnotifications/wc-customer-sms-template.php' );
	if ( ! MoUtility::mo_require_file( $template_file, MSN_DIR ) ) {
		return;
	}
	require $template_file;
} else {
	return;
}
