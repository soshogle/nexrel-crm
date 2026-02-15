<?php
/**
 * Load view for Admin SMS Notification
 *
 * @package miniorange-otp-verification/notifications/wcsmsnotification/controllers/smsnotifications
 */

namespace OTP\Notifications\WcSMSNotification\Controllers\SmsNotifications;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

use OTP\Helper\MoUtility;
use OTP\Helper\MoMessages;
use OTP\Notifications\WcSMSNotification\Helper\WooCommerceNotificationsList;

// Security: Verify user has proper capabilities to access admin SMS settings.
if ( ! function_exists( 'current_user_can' ) || ! current_user_can( 'manage_options' ) ) {
	wp_die( esc_html( MoMessages::showMessage( MoMessages::UNKNOWN_ERROR ) ) );
}

// Security: Validate notification settings object with fallback.
if ( ! isset( $notification_settings ) || ! is_object( $notification_settings ) ) {
	$notification_settings = WooCommerceNotificationsList::mo_otp_get_instance();
}

// Security: Validate SMS settings object and its properties.
$sms_settings = $notification_settings->wc_admin_order_status_notif;
if ( ! is_object( $sms_settings ) || ! isset( $sms_settings->page ) ) {
	wp_die( esc_html( MoMessages::showMessage( MoMessages::UNKNOWN_ERROR ) ) );
}

// Security: Sanitize page value to prevent XSS.
$page_value         = sanitize_key( $sms_settings->page );
$enable_disable_tag = $page_value;
$textarea_tag       = $page_value . '_smsbody';
$variable_tag       = $page_value . '_sms_tags';
$template_name      = $page_value . '_template_name';
$recipient_tag      = $page_value . '_recipient';

// Security: Safe deserialization with validation.
$recipient_value = '';
if ( isset( $sms_settings->recipient ) && ! empty( $sms_settings->recipient ) ) {
	// Only unserialize if it's a serialized string, otherwise treat as plain text.
	if ( is_serialized( $sms_settings->recipient ) ) {
		$unserialized_data = maybe_unserialize( $sms_settings->recipient );
		// Additional validation: ensure it's an array or string.
		if ( is_array( $unserialized_data ) ) {
			$recipient_value = implode(
				';',
				array_map(
					static function ( $r ) {
						$r = is_scalar( $r ) ? (string) $r : '';
						$r = MoUtility::process_phone_number( $r );
						return trim( $r );
					},
					$unserialized_data
				)
			);
		} elseif ( is_string( $unserialized_data ) ) {
			$recipient_value = MoUtility::process_phone_number( $unserialized_data );
		}
	} else {
		$recipient_value = MoUtility::process_phone_number( (string) $sms_settings->recipient );
	}
}

$enable_disable = ( isset( $sms_settings->is_enabled ) && $sms_settings->is_enabled ) ? 'checked' : '';

// Security: Validate and secure file inclusion.
$template_file = '';
if ( defined( 'MSN_DIR' ) && ! empty( MSN_DIR ) ) {
	$template_file = MSN_DIR . '/views/smsnotifications/wc-admin-sms-template.php';
} else {
	wp_die( esc_html( MoMessages::showMessage( MoMessages::UNKNOWN_ERROR ) ) );
}

// Security: Validate file path and restrict to plugin directory.
if ( ! MoUtility::mo_require_file( $template_file, MSN_DIR ) ) {
	return;
}
require $template_file;
