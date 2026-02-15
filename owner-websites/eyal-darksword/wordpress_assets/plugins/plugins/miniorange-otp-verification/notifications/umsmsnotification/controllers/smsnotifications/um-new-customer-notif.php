<?php
/**
 * Load admin view for Ultimate member new customer notifications.
 *
 * @package miniorange-otp-verification/notifications/umsmsnotification/controllers/smsnotifications
 */

namespace OTP\Notifications\UmSMSNotification\Controllers\SmsNotifications;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

use OTP\Helper\MoUtility;
use OTP\Notifications\UmSMSNotification\Helper\UltimateMemberNotificationsList;

// Access control check - only administrators can access SMS notification settings.
if ( ! function_exists( 'current_user_can' ) || ! current_user_can( 'manage_options' ) ) {
	return;
}

// Use the notification_settings from parent scope if available, otherwise fetch from DB.
if ( ! isset( $notification_settings ) || ! is_object( $notification_settings ) ) {
	$notification_settings = get_umsn_option( 'notification_settings_option' );
	// Secure deserialization with validation and PHP 5.6 compatibility.
	if ( $notification_settings && is_serialized( $notification_settings ) ) {
		$notification_settings = maybe_unserialize( $notification_settings );
		// Validate that deserialization resulted in expected object type.
		if ( ! is_object( $notification_settings ) || ! method_exists( $notification_settings, 'get_um_new_customer_notif' ) ) {
			$notification_settings = UltimateMemberNotificationsList::mo_otp_get_instance();
		}
	} else {
		$notification_settings = $notification_settings ? $notification_settings : UltimateMemberNotificationsList::mo_otp_get_instance();
	}
}

$sms_settings = $notification_settings->um_new_customer_notif;
if ( ! is_object( $sms_settings ) ) {
	return;
}
$enable_disable_tag = isset( $sms_settings->page ) ? sanitize_text_field( wp_unslash( $sms_settings->page ) ) : '';
$textarea_tag       = $enable_disable_tag . '_smsbody';
$recipient_tag      = $enable_disable_tag . '_recipient';
$recipient_value    = 'mobile_number';
if ( isset( $sms_settings->recipient ) ) {
	$recipient_data = $sms_settings->recipient;
	if ( is_string( $recipient_data ) && is_serialized( $recipient_data ) ) {
		$recipient_unserialized = maybe_unserialize( $recipient_data );
	} else {
		$recipient_unserialized = $recipient_data;
	}
	if ( is_array( $recipient_unserialized ) ) {
		$recipient_value = implode( ';', array_map( 'sanitize_text_field', $recipient_unserialized ) );
	} elseif ( is_string( $recipient_unserialized ) ) {
		$recipient_value = sanitize_text_field( wp_unslash( $recipient_unserialized ) );
	}
}
$enable_disable = ( isset( $sms_settings->is_enabled ) && $sms_settings->is_enabled ) ? 'checked' : '';
$template_file  = UMSN_DIR . '/views/smsnotifications/um-customer-sms-template.php';
if ( ! MoUtility::mo_require_file( $template_file, UMSN_DIR ) ) {
	return;
}
require_once $template_file;
