<?php
/**
 * Load view for premium SMS Notifications List
 *
 * @package miniorange-otp-verification/controllers
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

use OTP\Helper\MoUtility;
use OTP\Helper\MoConstants;

// Validate $subtab variable from parent controller.
$subtab = isset( $subtab ) ? sanitize_text_field( $subtab ) : '';

// Validate $license_url from parent controller and sanitize it.
$license_url = isset( $license_url ) && is_string( $license_url ) ? esc_url_raw( $license_url ) : '';

// Whitelist of allowed premium notifications (prevents injection via array keys).
$premium_notifications = array(
	'dokannotif' => array(
		'subtab'      => 'dokanNotifSubTab',
		'filename'    => 'dokannotif',
		'discription' => sprintf(
			// translators: 1: Dokan Notifications, 2: License URL, 3: Licensing Tab.
			__(
				'Enable Order Status Notifications for the Vendors on the Dokan Platform. <br><br><b>%1$s</b> is a WooCommerce plan feature. Check <a class="font-semibold text-yellow-500" href="%2$s">%3$s</a> to learn more.',
				'miniorange-otp-verification'
			),
			'Dokan Notifications',
			esc_url( $license_url ),
			__( 'Licensing Tab', 'miniorange-otp-verification' )
		),
	),

	'wcfmnotif'  => array(
		'subtab'      => 'wcfmNotifSubTab',
		'filename'    => 'wcfmsmsnotification',
		'discription' => sprintf(
			// translators: 1: WCFM Notifications, 2: License URL, 3: Licensing Tab.
			__(
				'Enable Order Status Notifications for the Vendors on the WCFM Platform. <br><br><b>%1$s</b> is a WooCommerce plan feature. Check <a class="font-semibold text-yellow-500" href="%2$s">%3$s</a> to learn more.',
				'miniorange-otp-verification'
			),
			'WCFM Notifications',
			esc_url( $license_url ),
			__( 'Licensing Tab', 'miniorange-otp-verification' )
		),
	),

	'formNotif'  => array(
		'subtab'      => 'formNotifSubTab',
		'filename'    => 'formsmsnotification',
		'discription' => sprintf(
			// translators: 1: Forms Notifications, 2: Support Email.
			__(
				'Enable SMS Notifications on submission of Login, Registration and Contact Forms. <br><br><b>%1$s</b> is a premium feature. Contact us at <a style="cursor:pointer;" onClick="otpSupportOnClick(\'Hi! I am interested in using Form Notifications feature. Please help me with more information.\');"><u>%2$s</u></a> to know more.',
				'miniorange-otp-verification'
			),
			'Forms Notifications',
			MoConstants::FEEDBACK_EMAIL
		),
	),
);

foreach ( $premium_notifications as $notif => $notif_subtab ) {
	if ( MoUtility::is_plugin_installed( $notif . '/miniorange-custom-validation.php' ) ) {
		$controller_file = str_replace( MOV_NAME, $notif, realpath( __DIR__ . DIRECTORY_SEPARATOR . '..' ) ) . '/controllers/main-controller.php';
		if ( MoUtility::mo_require_file( $controller_file, MOV_DIR ) ) {
			require $controller_file;
		}
	} else {
		$premium_notif_hidden = $notif_subtab['subtab'] !== $subtab ? 'hidden' : '';
		$premium_notif_id     = $notif_subtab['subtab'] . 'Container';

		if ( is_dir( MOV_DIR . '/notifications/' . $notif_subtab['filename'] ) ) {
			$controller_file = MOV_DIR . 'notifications/' . $notif_subtab['filename'] . '/controllers/main-controller.php';
			if ( MoUtility::mo_require_file( $controller_file, MOV_DIR ) ) {
				require $controller_file;
			}
		} else {
			$view_file = MOV_DIR . 'views/premium-notifications.php';
			if ( MoUtility::mo_require_file( $view_file, MOV_DIR ) ) {
				require $view_file;
			}
		}
	}
}
