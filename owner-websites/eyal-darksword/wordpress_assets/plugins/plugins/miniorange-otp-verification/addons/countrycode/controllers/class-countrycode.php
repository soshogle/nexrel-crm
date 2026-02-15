<?php
/**
 * Custom messages controller.
 *
 * @package miniorange-otp-verification/addons/countrycode/controllers
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

use OTP\Addons\CountryCode\Handler\SelectedCountryCode;
use OTP\Handler\MoActionHandlerHandler;
use OTP\Helper\MoFormDocs;
use OTP\Helper\MoMessages;
use OTP\Helper\MoUtility;

$handler                           = SelectedCountryCode::instance();
$admin_handler                     = MoActionHandlerHandler::instance();
$sc_type                           = $handler->get_sc_type();
$sc_enabled                        = $handler->get_is_enabled();
$sc_block                          = $handler->get_is_block_country_enabled();
$nonce                             = $admin_handler->get_nonce_value();
$otp_selected_countries_list       = $handler->get_is_country_allowed();
$otp_block_selected_countries_list = $handler->get_is_country_blocked();
$guide_link                        = MoFormDocs::SELECTED_COUNTRY_CODE_ADDON_LINK['guideLink'];
$guide_link_url                    = isset( $guide_link ) ? $guide_link : '';
$addon_url                         = isset( $addon ) ? $addon : '';
$sc_type_value                     = isset( $sc_type ) ? sanitize_key( wp_unslash( $sc_type ) ) : '';
$sc_allow_value                    = isset( $sc_enabled ) ? sanitize_key( wp_unslash( $sc_enabled ) ) : '';
$sc_block_value                    = isset( $sc_block ) ? sanitize_key( wp_unslash( $sc_block ) ) : '';
$is_disabled                       = ! empty( $disabled );
$allowed_countries_list            = isset( $otp_selected_countries_list ) ? $otp_selected_countries_list : '';
$blocked_countries_list            = isset( $otp_block_selected_countries_list ) ? $otp_block_selected_countries_list : '';
$all_country_list                  = mo_get_sc_option( 'allcountrywithcountrycode' );
$all_country_list                  = is_array( $all_country_list ) ? $all_country_list : array();
$show_allowed_section              = $sc_type_value === $sc_allow_value;
$show_block_section                = $sc_type_value === $sc_block_value;

// Security: Validate file path before including.
$view_file = MO_SC_DIR . 'views/countrycode.php';
if ( ! MoUtility::mo_require_file( $view_file, MO_SC_DIR ) ) {
	return;
}
require $view_file;
