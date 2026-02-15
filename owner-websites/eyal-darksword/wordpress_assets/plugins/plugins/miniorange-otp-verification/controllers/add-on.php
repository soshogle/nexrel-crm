<?php
/**
 * Loads list of addons.
 *
 * @package miniorange-otp-verification/controllers
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

use OTP\Helper\MoUtility;

$moaddon_request_uri = isset( $_SERVER['REQUEST_URI'] ) ? esc_url_raw( wp_unslash( $_SERVER['REQUEST_URI'] ) ) : '';
$woocommerce_url     = add_query_arg( array( 'addon' => 'woocommerce_notif' ), $moaddon_request_uri );
$custom              = add_query_arg( array( 'addon' => 'custom' ), $moaddon_request_uri );
$ultimate_mem        = add_query_arg( array( 'addon' => 'um_notif' ), $moaddon_request_uri );
$ultimate_mem_pr     = add_query_arg( array( 'addon' => 'umpr_notif' ), $moaddon_request_uri );
$woocommerce_pr      = add_query_arg( array( 'addon' => 'wcpr_notif' ), $moaddon_request_uri );


$addon_name = MoUtility::get_current_page_parameter_value( 'addon', '' );
if ( ! empty( $addon_name ) ) {
	return;
}

$view_file = MOV_DIR . 'views/add-on.php';
if ( ! MoUtility::mo_require_file( $view_file, MOV_DIR ) ) {
	return;
}
require $view_file;
