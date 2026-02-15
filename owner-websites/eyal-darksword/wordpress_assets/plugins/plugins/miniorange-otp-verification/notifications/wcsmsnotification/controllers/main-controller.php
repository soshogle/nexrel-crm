<?php
/**
 * Load controller for SMS Notifications view
 *
 * @package miniorange-otp-verification/Notifications/wcsmsnotification/controllers
 */

namespace OTP\Notifications\WcSMSNotification\Controllers;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

use OTP\Helper\MoMessages;
use OTP\Notifications\WcSMSNotification\Handler\WooCommerceNotifications;
use OTP\Helper\MoUtility;

// Access control check - only administrators can access SMS notification settings.
if ( ! function_exists( 'current_user_can' ) || ! current_user_can( 'manage_options' ) ) {
	wp_die( esc_html( MoMessages::showMessage( MoMessages::UNKNOWN_ERROR ) ) );
}

$registered      = WooCommerceNotifications::instance()->moAddOnV();
$mo_current_user = wp_get_current_user();

// Validate MSN_DIR constant and sanitize path.
if ( ! defined( 'MSN_DIR' ) || empty( MSN_DIR ) ) {
	wp_die( esc_html( MoMessages::showMessage( MoMessages::UNKNOWN_ERROR ) ) );
}

$wc_controller = trailingslashit( MSN_DIR ) . 'controllers/';

// Secure file inclusion with path validation.
$include_file = $wc_controller . 'wc-sms-notification.php';
if ( ! MoUtility::mo_require_file( $include_file, MSN_DIR ) ) {
	wp_die( esc_html( MoMessages::showMessage( MoMessages::UNKNOWN_ERROR ) ) );
}
require $include_file;
