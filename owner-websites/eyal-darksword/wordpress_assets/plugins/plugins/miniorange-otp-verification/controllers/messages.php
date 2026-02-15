<?php
/**
 * Loads admin view for common message tab.
 *
 * @package miniorange-otp-verification/controllers
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}
use OTP\Helper\MoMessages;
use OTP\Helper\MoUtility;

// Validate admin handler exists before accessing.
if ( ! isset( $admin_handler ) || ! is_object( $admin_handler ) || ! method_exists( $admin_handler, 'get_nonce_value' ) ) {
	return;
}
$nonce = $admin_handler->get_nonce_value();
// Validate nonce is not empty.
if ( empty( $nonce ) || ! is_string( $nonce ) ) {
	return;
}

$msg_list          = MoMessages::get_original_message_list();
$frontend_msg_list = MoMessages::get_frontend_message_list();
// Ensure msg_list and frontend_msg_list are arrays.
if ( ! is_array( $msg_list ) ) {
	$msg_list = array();
}
if ( ! is_array( $frontend_msg_list ) ) {
	$frontend_msg_list = array();
}
$subtab               = isset( $subtab ) ? sanitize_text_field( $subtab ) : 'messagesSubTab';
$common_msg_hidden    = 'messagesSubTab' !== $subtab ? 'hidden' : '';
$otp_success_email    = get_mo_option( 'success_email_message', 'mo_otp_' ) ? get_mo_option( 'success_email_message', 'mo_otp_' ) : MoMessages::showMessage( MoMessages::OTP_SENT_EMAIL );
$otp_success_phone    = get_mo_option( 'success_phone_message', 'mo_otp_' ) ? get_mo_option( 'success_phone_message', 'mo_otp_' ) : MoMessages::showMessage( MoMessages::OTP_SENT_PHONE );
$otp_error_phone      = get_mo_option( 'error_phone_message', 'mo_otp_' ) ? get_mo_option( 'error_phone_message', 'mo_otp_' ) : MoMessages::showMessage( MoMessages::ERROR_OTP_PHONE );
$otp_error_email      = get_mo_option( 'error_email_message', 'mo_otp_' ) ? get_mo_option( 'error_email_message', 'mo_otp_' ) : MoMessages::showMessage( MoMessages::ERROR_OTP_EMAIL );
$phone_invalid_format = get_mo_option( 'invalid_phone_message', 'mo_otp_' ) ? get_mo_option( 'invalid_phone_message', 'mo_otp_' ) : MoMessages::showMessage( MoMessages::ERROR_PHONE_FORMAT );
$email_invalid_format = get_mo_option( 'invalid_email_message', 'mo_otp_' ) ? get_mo_option( 'invalid_email_message', 'mo_otp_' ) : MoMessages::showMessage( MoMessages::ERROR_EMAIL_FORMAT );
$invalid_otp          = MoUtility::get_invalid_otp_method();
$otp_blocked_email    = get_mo_option( 'blocked_email_message', 'mo_otp_' ) ? get_mo_option( 'blocked_email_message', 'mo_otp_' ) : MoMessages::showMessage( MoMessages::ERROR_EMAIL_BLOCKED );
$otp_blocked_phone    = get_mo_option( 'blocked_phone_message', 'mo_otp_' ) ? get_mo_option( 'blocked_phone_message', 'mo_otp_' ) : MoMessages::showMessage( MoMessages::ERROR_PHONE_BLOCKED );
// Validate array keys exist before accessing to prevent undefined index errors.
$phone_entries = array();
if ( isset( $msg_list['OTP_SENT_PHONE'] ) ) {
	$phone_entries['OTP_SENT_PHONE'] = array(
		'old_msg' => $msg_list['OTP_SENT_PHONE'],
		'new_msg' => $otp_success_phone,
		'label'   => __( 'Success OTP Message', 'miniorange-otp-verification' ),
	);
}
if ( isset( $msg_list['ERROR_OTP_PHONE'] ) ) {
	$phone_entries['ERROR_OTP_PHONE'] = array(
		'old_msg' => $msg_list['ERROR_OTP_PHONE'],
		'new_msg' => $otp_error_phone,
		'label'   => __( 'Error OTP Message', 'miniorange-otp-verification' ),
	);
}
if ( isset( $msg_list['ERROR_PHONE_FORMAT'] ) ) {
	$phone_entries['ERROR_PHONE_FORMAT'] = array(
		'old_msg' => $msg_list['ERROR_PHONE_FORMAT'],
		'new_msg' => $phone_invalid_format,
		'label'   => __( 'Invalid Format Message', 'miniorange-otp-verification' ),
	);
}
if ( isset( $msg_list['ERROR_PHONE_BLOCKED'] ) ) {
	$phone_entries['ERROR_PHONE_BLOCKED'] = array(
		'old_msg' => $msg_list['ERROR_PHONE_BLOCKED'],
		'new_msg' => $otp_blocked_phone,
		'label'   => __( 'Blocked Number Message', 'miniorange-otp-verification' ),
	);
}

// Validate array keys exist before accessing to prevent undefined index errors.
$email_entries = array();
if ( isset( $msg_list['OTP_SENT_EMAIL'] ) ) {
	$email_entries['OTP_SENT_EMAIL'] = array(
		'old_msg' => $msg_list['OTP_SENT_EMAIL'],
		'new_msg' => $otp_success_email,
		'label'   => __( 'Success OTP Message', 'miniorange-otp-verification' ),
	);
}
if ( isset( $msg_list['ERROR_OTP_EMAIL'] ) ) {
	$email_entries['ERROR_OTP_EMAIL'] = array(
		'old_msg' => $msg_list['ERROR_OTP_EMAIL'],
		'new_msg' => $otp_error_email,
		'label'   => __( 'Error OTP Message', 'miniorange-otp-verification' ),
	);
}
if ( isset( $msg_list['ERROR_EMAIL_FORMAT'] ) ) {
	$email_entries['ERROR_EMAIL_FORMAT'] = array(
		'old_msg' => $msg_list['ERROR_EMAIL_FORMAT'],
		'new_msg' => $email_invalid_format,
		'label'   => __( 'Invalid Format Message', 'miniorange-otp-verification' ),
	);
}
if ( isset( $msg_list['ERROR_EMAIL_BLOCKED'] ) ) {
	$email_entries['ERROR_EMAIL_BLOCKED'] = array(
		'old_msg' => $msg_list['ERROR_EMAIL_BLOCKED'],
		'new_msg' => $otp_blocked_email,
		'label'   => __( 'Blocked Email Message', 'miniorange-otp-verification' ),
	);
}

// Validate array keys exist before accessing to prevent undefined index errors.
$custom_entries = array();
if ( isset( $msg_list['INVALID_OTP'] ) ) {
	$custom_entries['INVALID_OTP'] = array(
		'old_msg' => $msg_list['INVALID_OTP'],
		'new_msg' => $invalid_otp,
		'label'   => __( 'Invalid OTP Message', 'miniorange-otp-verification' ),
	);
}

$combined_message_array = array_merge( $phone_entries, $email_entries, $custom_entries );

// Validate array keys and sanitize user input from options.
foreach ( $msg_list as $key => $value ) {
	// Sanitize key to prevent injection.
	$sanitized_key = sanitize_key( $key );
	if ( ! empty( $sanitized_key ) && $sanitized_key === $key ) {
		$option_value = get_mo_option( $key, 'mo_otp_' );
		if ( $option_value && ! isset( $combined_message_array[ $key ] ) && isset( $msg_list[ $key ] ) ) {
			$sanitized_option       = sanitize_textarea_field( $option_value );
			$custom_entries[ $key ] = array(
				'old_msg' => $msg_list[ $key ],
				'new_msg' => $sanitized_option,
				'label'   => __( 'Custom Message', 'miniorange-otp-verification' ),
			);
		}
	}
}

$final_message_array = array_merge( $combined_message_array, $custom_entries );

/**
 * Define a regular expression pattern to match any special characters
 *
 * @param string $sentence sentence to be checked.
 * @return boolean
 */
function has_special_characters( $sentence ) {
	$pattern = '/[<>]/';
	return preg_match( $pattern, $sentence ) === 1;
}
$reduced_msg_list = array_diff_key( $frontend_msg_list, $final_message_array );

// Validate and sanitize values in reduced message list.
foreach ( $reduced_msg_list as $key => $value ) {
	// Ensure value is a string before processing.
	if ( ! is_string( $value ) ) {
		unset( $reduced_msg_list[ $key ] );
		continue;
	}
	// Check for special characters that could indicate XSS attempts.
	if ( has_special_characters( $value ) ) {
		unset( $reduced_msg_list[ $key ] );
	}
}
$view_file = MOV_DIR . 'views/messages.php';
if ( ! MoUtility::mo_require_file( $view_file, MOV_DIR ) ) {
	return;
}
require $view_file;
