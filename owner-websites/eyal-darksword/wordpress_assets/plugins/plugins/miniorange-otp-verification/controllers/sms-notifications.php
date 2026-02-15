<?php
/**
 * Load view for SMS Notifications List
 *
 * @package miniorange-otp-verification/controllers
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

use OTP\Helper\MoUtility;

$notif_folder = MOV_DIR . 'notifications/';

// Whitelist of allowed subtab values for SMS notifications.
$allowed_subtabs = array(
	'MowcNotifSubTab',
	'MoumNotifSubTab',
	'dokanNotifSubTab',
	'wcfmNotifSubTab',
	'formNotifSubTab',
);

$subtab_raw = MoUtility::get_current_page_parameter_value( 'subpage', 'MowcNotifSubTab' );

// Validate against whitelist to prevent injection attacks.
$subtab = in_array( $subtab_raw, $allowed_subtabs, true ) ? $subtab_raw : 'MowcNotifSubTab';

// Validate and require WooCommerce SMS notification controller.
$wcsms_controller = $notif_folder . 'wcsmsnotification/controllers/main-controller.php';
if ( MoUtility::mo_require_file( $wcsms_controller, MOV_DIR ) ) {
	require $wcsms_controller;
}

// Validate and require Ultimate Member SMS notification controller.
$umsms_controller = $notif_folder . 'umsmsnotification/controllers/main-controller.php';
if ( MoUtility::mo_require_file( $umsms_controller, MOV_DIR ) ) {
	require $umsms_controller;
}

// Validate and require premium notification controller.
$premium_notif_controller = MOV_DIR . 'controllers/premium-notif-controller.php';
if ( MoUtility::mo_require_file( $premium_notif_controller, MOV_DIR ) ) {
	require $premium_notif_controller;
}
