<?php
/**
 * Controller for settings
 *
 * @package miniorange-otp-verification/controller
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

use OTP\Helper\MoConstants;
use OTP\Helper\MoUtility;
use OTP\Objects\Tabs;
use OTP\Helper\PremiumFeatureList;
use OTP\Objects\TabDetails;

// Validate admin handler exists before accessing.
if ( ! isset( $admin_handler ) || ! is_object( $admin_handler ) || ! method_exists( $admin_handler, 'get_nonce_value' ) ) {
	return;
}

// Validate $tab_details object exists and has required properties.
if ( ! isset( $tab_details ) || ! is_object( $tab_details ) || ! isset( $tab_details->tab_details ) ) {
	return;
}

// Validate FORMS tab exists.
if ( ! isset( $tab_details->tab_details[ Tabs::FORMS ] ) || ! isset( $tab_details->tab_details[ Tabs::FORMS ]->menu_slug ) ) {
	return;
}

// Validate OTP_SETTINGS tab exists.
if ( ! isset( $tab_details->tab_details[ Tabs::OTP_SETTINGS ] ) || ! isset( $tab_details->tab_details[ Tabs::OTP_SETTINGS ]->url ) ) {
	return;
}

// Validate ADD_ONS tab exists.
if ( ! isset( $tab_details->tab_details[ Tabs::ADD_ONS ] ) || ! isset( $tab_details->tab_details[ Tabs::ADD_ONS ]->url ) || ! isset( $tab_details->tab_details[ Tabs::ADD_ONS ]->menu_slug ) ) {
	return;
}

$page_list = admin_url() . 'edit.php?post_type=page';
$plan_type = MoUtility::micv() ? 'wp_otp_verification_upgrade_plan' : 'wp_otp_verification_basic_plan';

$nonce = $admin_handler->get_nonce_value();
// Validate nonce is not empty.
if ( empty( $nonce ) || ! is_string( $nonce ) ) {
	return;
}

$moaction        = add_query_arg(
	array(
		'page' => $tab_details->tab_details[ Tabs::FORMS ]->menu_slug,
		'form' => 'configured_forms#configured_forms',
	)
);
$forms_list_page = add_query_arg(
	'page',
	$tab_details->tab_details[ Tabs::FORMS ]->menu_slug . '#form_search',
	remove_query_arg( array( 'form' ) )
);

$form_name = MoUtility::get_current_page_parameter_value( 'form', '' );
$form_name = ! empty( $form_name ) ? $form_name : false;
if ( 'MoWCCheckoutNew' === $form_name ) {
	$form_name = 'WooCommerceCheckOutForm';
}
$show_configured_forms = 'configured_forms' === $form_name;

$otp_settings_tab = $tab_details->tab_details[ Tabs::OTP_SETTINGS ];
$otp_settings     = $otp_settings_tab->url;

$add_on_tab = $tab_details->tab_details[ Tabs::ADD_ONS ];
$addon      = $add_on_tab->url;

// Validate PremiumFeatureList class exists before instantiating.
if ( ! class_exists( 'OTP\Helper\PremiumFeatureList' ) ) {
	return;
}

$premium_feature_list           = PremiumFeatureList::instance();
$both_email_and_phone_form_list = $premium_feature_list->get_both_email_phone_addon_forms();

// Only create new instance if needed for additional operations, but preserve original.
$addon_tab     = $tab_details->tab_details[ Tabs::ADD_ONS ];
$req_url       = isset( $_SERVER['REQUEST_URI'] ) ? esc_url_raw( wp_unslash( $_SERVER['REQUEST_URI'] ) ) : '';
$addon_tab_url = add_query_arg( array( 'page' => $addon_tab->menu_slug ), $req_url );

$support = MoConstants::FEEDBACK_EMAIL;

// Validate file path using MoUtility::mo_require_file() before including.
$view_file = MOV_DIR . 'views/settings.php';
if ( ! MoUtility::mo_require_file( $view_file, MOV_DIR ) ) {
	return;
}
require $view_file;
