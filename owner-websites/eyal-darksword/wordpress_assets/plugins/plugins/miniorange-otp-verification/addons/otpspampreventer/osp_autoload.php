<?php
/**
 * Autoload file for OTP Spam Preventer addon
 *
 * @package otpspampreventer
 */

use OSP\OspSplClassLoader;
use OSP\Handler\MoOtpSpamPreventerAddonHandler;
use OSP\Handler\MoOtpSpamIntegration;
use OTP\Helper\MoUtility;
use OTP\Helper\AddOnList;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'MO_OSP_DIR', plugin_dir_path( __FILE__ ) );
define( 'MO_OSP_URL', plugin_dir_url( __FILE__ ) );

if ( ! class_exists( 'OTP\Helper\AddOnList' ) ) {
	return;
}
require 'class-ospsplclassloader.php';

$osp_class_loader = new OspSplClassLoader( 'OSP', realpath( __DIR__ ) );
$osp_class_loader->register();
$list    = AddOnList::instance();
$handler = MoOtpSpamPreventerAddonHandler::instance();
$list->add( $handler->getAddOnKey(), $handler );

// Initialize integration.
MoOtpSpamIntegration::instance();

add_action( 'mo_otp_verification_add_on_controller', 'mo_show_osp_addon_settings_page', 1, 1 );

/**
 * This function hooks into the mo_otp_verification_add_on_controller
 * hook to show the OTP Spam Preventer add-on settings page.
 */
function mo_show_osp_addon_settings_page() {
	require MO_OSP_DIR . 'controllers/main-controller.php';
}

/*
|------------------------------------------------------------------------------------------------------
| SOME COMMON FUNCTIONS USED ALL OVER THE ADD-ON
|------------------------------------------------------------------------------------------------------
*/

/**
 * This function is used to handle the add-ons get option call. A separate function has been created so that
 * we can manage getting of database values all from one place. Any changes need to be made can be made here
 * rather than having to make changes in all of the add-on files.
 *
 * Calls the mains plugins get_mo_option function.
 *
 * @param string      $option_name - option name.
 * @param bool|string $prefix - prefix for database keys.
 * @return String
 */
function get_mo_osp_option( $option_name, $prefix = null ) {
	$option_name = ( null === $prefix ) ? $option_name : $prefix . $option_name;
	return get_mo_option( $option_name );
}

/**
 * This function is used to handle the add-ons update option call. A separate function has been created so that
 * we can manage updating of database values all from one place. Any changes need to be made can be made here
 * rather than having to make changes in all of the add-on files.
 *
 * Calls the mains plugins update_mo_option function.
 *
 * @param string      $option_name - option name.
 * @param string      $value - option value.
 * @param bool|string $prefix - prefix for database keys.
 * @return void
 */
function update_mo_osp_option( $option_name, $value, $prefix = null ) {
	$option_name = ( null === $prefix ) ? $option_name : $prefix . $option_name;
	update_mo_option( $option_name, $value );
}

/**
 * This function is used to handle the add-ons delete option call.
 *
 * @param string      $option_name - option name.
 * @param bool|string $prefix - prefix for database keys.
 * @return void
 */
function delete_mo_osp_option( $option_name, $prefix = null ) {
	$option_name = ( null === $prefix ) ? $option_name : $prefix . $option_name;
	delete_mo_option( $option_name );
}
