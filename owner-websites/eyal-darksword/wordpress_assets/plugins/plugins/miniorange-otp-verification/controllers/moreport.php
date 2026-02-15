<?php
/**
 * Load admin view for MoReport feature.
 *
 * @package miniorange-otp-verification/controllers
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}
use OTP\Helper\MoUtility;

// Validate admin handler exists before accessing.
if ( ! isset( $admin_handler ) || ! is_object( $admin_handler ) || ! method_exists( $admin_handler, 'get_nonce_value' ) ) {
	return;
}

$current_date      = gmdate( 'Y-m-d H:i' );
$current_timestamp = time();
$time              = gmdate( 'Y-m-d H:i', $current_timestamp - ( 60 * 60 ) );
$from_date         = gmdate( 'Y-m-d H:i', strtotime( '-1 days' ) );
$mle               = MoUtility::mllc();

// Validate $mle is an array and has STATUS key before accessing.
if ( ! is_array( $mle ) ) {
	$mle = array( 'STATUS' => false );
}
$mle_status = isset( $mle['STATUS'] ) ? $mle['STATUS'] : false;

// Validate file path to prevent directory traversal.
$helper_file      = MOV_DIR . 'helper/class-moreporting.php';
$real_helper_file = realpath( $helper_file );
$real_mov_dir     = realpath( MOV_DIR );

// Ensure helper file is within the plugin directory if it exists.
$helper_exists = false;
if ( $real_helper_file && $real_mov_dir && strpos( $real_helper_file, $real_mov_dir ) === 0 ) {
	$helper_exists = file_exists( $helper_file );
}

$disabled    = ( ! $helper_exists || $mle_status ) ? 'disabled' : '';
$show_notice = ! $helper_exists ? 'true' : '';

$nonce = $admin_handler->get_nonce_value();
// Validate nonce is not empty.
if ( empty( $nonce ) || ! is_string( $nonce ) ) {
	return;
}
$is_mo_report_enabled = get_mo_option( 'is_mo_report_enabled' ) ? 'checked' : '';

// Validate file path to prevent directory traversal.
$view_file = MOV_DIR . 'views/moreport.php';

if ( ! MoUtility::mo_require_file( $view_file, MOV_DIR ) ) {
	return;
}
require $view_file;
