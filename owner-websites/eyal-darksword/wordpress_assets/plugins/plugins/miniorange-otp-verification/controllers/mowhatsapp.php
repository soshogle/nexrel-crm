<?php
/**
 * Loads admin view for WhatsApp functionality.
 *
 * @package miniorange-otp-verification/controllers
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}
use OTP\Objects\Tabs;
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

// Validate variables from parent controller.
$registered = isset( $registered ) ? (bool) $registered : false;
$activated  = isset( $activated ) ? (bool) $activated : false;

// Validate $tab_details object exists and has required properties.
if ( ! isset( $tab_details ) || ! is_object( $tab_details ) || ! isset( $tab_details->tab_details ) || ! isset( $tab_details->tab_details[ Tabs::PRICING ] ) ) {
	return;
}

// Validate $request_uri is a string and sanitize it.
$request_uri = isset( $request_uri ) && is_string( $request_uri ) ? esc_url_raw( $request_uri ) : '';

$tooltip_disabled = ( $registered && $activated ) ? true : false;
$disabled         = ( $registered && $activated ) ? '' : 'disabled';
$license_url      = add_query_arg( array( 'page' => $tab_details->tab_details[ Tabs::PRICING ]->menu_slug ), $request_uri );

// Validate file path to prevent directory traversal.
$view_file = MOV_DIR . 'views/mowhatsapp.php';
if ( ! MoUtility::mo_require_file( $view_file, MOV_DIR ) ) {
	return;
}
require $view_file;
