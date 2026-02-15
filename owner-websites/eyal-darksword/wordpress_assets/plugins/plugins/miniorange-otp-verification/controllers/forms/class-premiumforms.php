<?php
/**
 * Loads admin view for PremiumForms.
 *
 * @package miniorange-otp-verification/controllers/forms
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

use OTP\Handler\Forms\PremiumForms;
use OTP\Helper\PremiumFeatureList;
use OTP\Helper\MoUtility;
use OTP\Objects\Tabs;
use OTP\Objects\TabDetails;

$premium_forms = PremiumFeatureList::instance();
$premium_forms = $premium_forms->get_premium_forms();

$handler     = PremiumForms::instance();
$form_name   = $handler->get_form_name();
$plan_name   = '';
$tab_details = TabDetails::instance();
$otp_path    = ! empty( $_SERVER['REQUEST_URI'] ) ? esc_url_raw( wp_unslash( $_SERVER['REQUEST_URI'] ) ) : '';
$query_str   = wp_parse_url( $otp_path, PHP_URL_QUERY );
if ( $query_str ) {
	$query_params = array();
	parse_str( $query_str, $query_params );
	if ( is_array( $query_params ) && ! empty( $query_params['form_name']['plan_name'] ) ) {
		$plan_name = sanitize_text_field( $query_params['form_name']['plan_name'] );
	}
	unset( $query_params );
}
$server_uri = isset( $_SERVER['REQUEST_URI'] ) ? esc_url_raw( wp_unslash( $_SERVER['REQUEST_URI'] ) ) : '';

if ( empty( $server_uri ) ) {
	$server_uri = admin_url();
}
$request_uri = remove_query_arg( array( 'addon', 'form', 'subpage' ), $server_uri );
if ( ! isset( $tab_details ) || ! is_object( $tab_details ) || ! isset( $tab_details->tab_details ) ) {
	$license_url = admin_url();
} elseif ( ! isset( $tab_details->tab_details[ Tabs::PRICING ] ) || ! isset( $tab_details->tab_details[ Tabs::PRICING ]->menu_slug ) ) {
	$license_url = admin_url();
} else {
	$license_url = add_query_arg( array( 'page' => $tab_details->tab_details[ Tabs::PRICING ]->menu_slug ), $request_uri );
}
$view_file_path = MOV_DIR . 'views/forms/premiumforms.php';
if ( MoUtility::mo_require_file( $view_file_path, MOV_DIR ) ) {
	require $view_file_path;
}
get_plugin_form_link( $handler->get_form_documents() );
