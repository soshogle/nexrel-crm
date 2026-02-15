<?php
/**
 * Main Controller of Ultimate member SMS notifications.
 *
 * @package miniorange-otp-verification/notifications/umsmsnotification/controllers
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
use OTP\Helper\MoUtility;
use OTP\Notifications\UmSMSNotification\Handler\UltimateMemberSMSNotificationsHandler;

$handler         = UltimateMemberSMSNotificationsHandler::instance();
$registered      = $handler->moAddOnV();
$mo_current_user = wp_get_current_user();
$um_controller   = UMSN_DIR . 'controllers/';
$controller_file = $um_controller . 'um-sms-notification.php';
if ( ! MoUtility::mo_require_file( $controller_file, UMSN_DIR ) ) {
	return;
}
require_once $controller_file;
