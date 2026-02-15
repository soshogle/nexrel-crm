<?php
/**
 * Loads admin view for otpsettings tab.
 *
 * @package miniorange-otp-verification/controllers
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}
use OTP\Helper\MoUtility;
use OTP\Helper\GatewayFunctions;

// Validate admin handler exists before accessing.
if ( ! isset( $admin_handler ) || ! is_object( $admin_handler ) || ! method_exists( $admin_handler, 'get_nonce_value' ) ) {
	return;
}

// Validate $subtab variable from parent controller.
$subtab = isset( $subtab ) ? sanitize_text_field( $subtab ) : 'otpSettingsSubTab';

// Validate $disabled variable from parent controller.
$disabled = isset( $disabled ) && is_string( $disabled ) ? $disabled : 'disabled';

$hidden = 'otpSettingsSubTab' !== $subtab ? 'hidden' : '';

// Validate and sanitize option values with proper type casting.
$show_trans_option = get_mo_option( 'show_remaining_trans' );
$show_trans        = $show_trans_option ? 'checked' : '';

$show_dropdown_option  = get_mo_option( 'show_dropdown_on_form' );
$show_dropdown_on_form = $show_dropdown_option ? 'checked' : '';

// Validate OTP length is a positive integer.
$mo_otp_length_option = get_mo_option( 'otp_length' );
$mo_otp_length        = ! empty( $mo_otp_length_option ) ? absint( $mo_otp_length_option ) : 5;
if ( $mo_otp_length < 4 || $mo_otp_length > 10 ) {
	$mo_otp_length = 5; // Default to 5 if out of valid range.
}

// Validate OTP validity is a positive integer.
$mo_otp_validity_option = get_mo_option( 'otp_validity' );
$mo_otp_validity        = ! empty( $mo_otp_validity_option ) ? absint( $mo_otp_validity_option ) : 5;
if ( $mo_otp_validity < 1 || $mo_otp_validity > 60 ) {
	$mo_otp_validity = 5; // Default to 5 minutes if out of valid range.
}

$show_transaction_options = MoUtility::is_mg();

$nonce = $admin_handler->get_nonce_value();
// Validate nonce is not empty.
if ( empty( $nonce ) || ! is_string( $nonce ) ) {
	return;
}

// Validate GatewayFunctions class exists before instantiating.
if ( ! class_exists( 'OTP\Helper\GatewayFunctions' ) ) {
	return;
}

$gateway = GatewayFunctions::instance();

// Validate filter results and ensure proper type casting.
$alphanumeric_filter   = apply_filters( 'set_class_exists_aplhanumeric', false );
$alphanumeric_disabled = ( $alphanumeric_filter && 'disabled' !== $disabled ) ? '' : 'disabled';

$globallybanned_filter   = apply_filters( 'set_class_exists_globallybanned', false );
$globallybanned_disabled = ( $globallybanned_filter && 'disabled' !== $disabled ) ? '' : 'disabled';

$master_otp_filter   = apply_filters( 'set_class_exists_masterotp', false );
$master_otp_disabled = ( $master_otp_filter && 'disabled' !== $disabled ) ? '' : 'disabled';

$view_file = MOV_DIR . 'views/otpsettings.php';
if ( ! MoUtility::mo_require_file( $view_file, MOV_DIR ) ) {
	return;
}
require $view_file;
