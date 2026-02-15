<?php
/**
 * Load admin view for Ultimate member new customer - admin notifications.
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
	if ( $notification_settings && is_serialized( $notification_settings ) ) {
		$notification_settings = maybe_unserialize( $notification_settings );
		// Validate that deserialization resulted in expected object type.
		if ( ! is_object( $notification_settings ) || ! method_exists( $notification_settings, 'get_um_new_user_admin_notif' ) ) {
			$notification_settings = UltimateMemberNotificationsList::mo_otp_get_instance();
		}
	} else {
		$notification_settings = $notification_settings ? $notification_settings : UltimateMemberNotificationsList::mo_otp_get_instance();
	}
}

// Defensive access to avoid notices if property is missing or of unexpected type.
$sms_settings = isset( $notification_settings->um_new_user_admin_notif ) ? $notification_settings->um_new_user_admin_notif : null;

// Validate SMS settings object.
if ( ! is_object( $sms_settings ) ) {
	return;
}
$enable_disable_tag = isset( $sms_settings->page ) ? sanitize_text_field( wp_unslash( $sms_settings->page ) ) : '';
$textarea_tag       = $enable_disable_tag . '_smsbody';
$recipient_tag      = $enable_disable_tag . '_recipient';
$recipient_value    = maybe_unserialize( $sms_settings->recipient );
$recipient_value    = is_array( $recipient_value ) ? implode( ';', $recipient_value ) : $recipient_value;
$enable_disable     = $sms_settings->is_enabled ? 'checked' : '';

$template_file = UMSN_DIR . '/views/smsnotifications/um-admin-sms-template.php';
if ( ! MoUtility::mo_require_file( $template_file, UMSN_DIR ) ) {
	return;
}
require_once $template_file;
