<?php
/**
 * Custom messages controller.
 *
 * @package miniorange-otp-verification/addons/countrycode/controllers
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

use OTP\Addons\CountryCode\Handler\SelectedCountry;
use OTP\Helper\MoConstants;
use OTP\Helper\MoUtility;
use OTP\Helper\MoMessages;

$handler         = SelectedCountry::instance();
$registered      = $handler->moAddOnV();
$mle             = MoUtility::mllc();
$disabled        = ( ! $registered ) || ( $mle['STATUS'] ) ? 'disabled' : '';
$mo_current_user = wp_get_current_user();
$controller      = MO_SC_DIR . 'controllers/';
$req_url         = isset( $_SERVER['REQUEST_URI'] ) ? esc_url_raw( wp_unslash( $_SERVER['REQUEST_URI'] ) ) : '';
$addon           = add_query_arg( array( 'page' => 'addon' ), remove_query_arg( 'addon', $req_url ) );

if ( ! current_user_can( 'manage_options' ) ) {
	wp_die( esc_html__( 'You do not have permission to access this page.', 'miniorange-otp-verification' ) );
}

// Whitelist of allowed addon values for country code addon.
$allowed_addons = array(
	'selectedcountrycode',
);

$addon_name_raw = MoUtility::get_current_page_parameter_value( 'addon', '' );

// Validate against whitelist to prevent injection attacks.
$addon_name = in_array( $addon_name_raw, $allowed_addons, true ) ? $addon_name_raw : '';

if ( ! empty( $addon_name ) ) {
	switch ( $addon_name ) {
		case 'selectedcountrycode':
			$include_file = $controller . 'class-countrycode.php';
			if ( ! MoUtility::mo_require_file( $include_file, $controller ) ) {
				return;
			}
			require $include_file;
			break;
	}
}
