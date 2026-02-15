<?php
/**
 * Loads contact us form.
 *
 * @package miniorange-otp-verification/controllers
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

use OTP\Helper\MoUtility;

$nonce = $admin_handler->get_nonce_value();
$email = get_mo_option( 'admin_email' );
$phone = get_mo_option( 'admin_phone' );
$phone = $phone ? $phone : '';

$view_file = MOV_DIR . 'views/contactus.php';
if ( ! MoUtility::mo_require_file( $view_file, MOV_DIR ) ) {
	return;
}
require $view_file;
