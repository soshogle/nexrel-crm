<?php
/**
 * Loads deactivation feedback form.
 *
 * @package miniorange-otp-verification/controllers
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}
use OTP\Handler\MoActionHandlerHandler;
use OTP\Helper\MoUtility;
$message         = __( 'We are sad to see you go :( Have you found a bug? Did you feel something was missing? Whatever it is, we\'d love to hear from you and get better.', 'miniorange-otp-verification' );
$submit_message  = __( 'Submit & Deactivate', 'miniorange-otp-verification' );
$submit_message2 = __( 'Submit', 'miniorange-otp-verification' );

$admin_handler       = MoActionHandlerHandler::instance();
$nonce               = $admin_handler->get_nonce_value();
$deactivationreasons = $admin_handler->mo_feedback_reasons();

$view_file = MOV_DIR . 'views/feedback.php';
// Check if method exists before calling (safety check for version compatibility).
if ( class_exists( 'OTP\Helper\MoUtility' ) && method_exists( 'OTP\Helper\MoUtility', 'mo_require_file' ) ) {
	if ( ! MoUtility::mo_require_file( $view_file, MOV_DIR ) ) {
		return;
	}
} else {
	// Fallback: basic security check if method is not available.
	$real_view_file = realpath( $view_file );
	$real_base_dir  = realpath( MOV_DIR );
	if ( false === $real_view_file || false === $real_base_dir || 0 !== strpos( $real_view_file, $real_base_dir ) ) {
		return;
	}
}
require $view_file;
