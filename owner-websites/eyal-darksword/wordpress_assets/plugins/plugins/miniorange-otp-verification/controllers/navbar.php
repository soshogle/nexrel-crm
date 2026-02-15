<?php
/**
 * Controller For Navbar.
 *
 * @package miniorange-otp-verification/controllers
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}
use OTP\Helper\MoConstants;
use OTP\Helper\MoMessages;
use OTP\Objects\Tabs;
use OTP\Helper\MoUtility;

// Validate admin handler exists before accessing.
if ( ! isset( $admin_handler ) || ! is_object( $admin_handler ) || ! method_exists( $admin_handler, 'get_nonce_value' ) ) {
	return;
}

// Validate $tab_details object exists and has required properties.
if ( ! isset( $tab_details ) || ! is_object( $tab_details ) || ! isset( $tab_details->tab_details ) ) {
	return;
}

// Validate ACCOUNT tab exists.
if ( ! isset( $tab_details->tab_details[ Tabs::ACCOUNT ] ) || ! isset( $tab_details->tab_details[ Tabs::ACCOUNT ]->menu_slug ) ) {
	return;
}

// Validate PRICING tab exists.
if ( ! isset( $tab_details->tab_details[ Tabs::PRICING ] ) || ! isset( $tab_details->tab_details[ Tabs::PRICING ]->menu_slug ) ) {
	return;
}

// Sanitize and validate REQUEST_URI from $_SERVER.
$server_uri = isset( $_SERVER['REQUEST_URI'] ) ? esc_url_raw( wp_unslash( $_SERVER['REQUEST_URI'] ) ) : '';

// Ensure $server_uri is not empty before using remove_query_arg.
if ( empty( $server_uri ) ) {
	$server_uri = admin_url();
}

$request_uri    = remove_query_arg( array( 'addon', 'form', 'subpage' ), $server_uri );
$profile_url    = add_query_arg( array( 'page' => $tab_details->tab_details[ Tabs::ACCOUNT ]->menu_slug ), $request_uri );
$help_url       = MoConstants::FAQ_URL;
$register_msg   = MoMessages::showMessage( MoMessages::REGISTER_WITH_US, array( 'url' => $profile_url ) );
$activation_msg = MoMessages::showMessage( MoMessages::ACTIVATE_PLUGIN, array( 'url' => $profile_url ) );
$active_tab     = MoUtility::get_current_page_parameter_value( 'page', '' );
$license_url    = add_query_arg( array( 'page' => $tab_details->tab_details[ Tabs::PRICING ]->menu_slug ), $request_uri );
$nonce          = $admin_handler->get_nonce_value();

// Validate nonce is not empty.
if ( empty( $nonce ) || ! is_string( $nonce ) ) {
	return;
}

$is_logged_in   = MoUtility::micr();
$is_free_plugin = strcmp( MOV_TYPE, 'MiniOrangeGateway' ) === 0;

// Validate file path using MoUtility::mo_require_file() before including.
$view_file = MOV_DIR . 'views/navbar.php';
if ( ! MoUtility::mo_require_file( $view_file, MOV_DIR ) ) {
	return;
}
require $view_file;
