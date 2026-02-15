<?php
/**
 * OTP Spam Preventer Main controller.
 *
 * @package otpspampreventer/controllers
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
use OSP\Handler\MoOtpSpamPreventerAddonHandler;

$registered = MoOtpSpamPreventerAddonHandler::instance()->moAddOnV();
$controller = MO_OSP_DIR . 'controllers/';

$req_url = isset( $_SERVER['REQUEST_URI'] ) ? esc_url_raw( wp_unslash( $_SERVER['REQUEST_URI'] ) ) : '';

$addon = add_query_arg( array( 'page' => 'addon' ), remove_query_arg( 'addon', $req_url ) );
if ( isset( $_GET['addon'] ) ) { // phpcs:ignore WordPress.Security.NonceVerification.Missing, WordPress.Security.NonceVerification.Recommended -- Reading GET parameter from the URL for checking the addon name, doesn't require nonce verification.
	switch ( $_GET['addon'] ) { // phpcs:ignore WordPress.Security.NonceVerification.Missing, WordPress.Security.NonceVerification.Recommended -- Reading GET parameter from the URL for checking the addon name, doesn't require nonce verification.
		case 'otp_spam_preventer':
			include $controller . 'class-spampreventercontrol.php';
			break;
	}
}
