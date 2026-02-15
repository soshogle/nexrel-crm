<?php
/**
 * Autoload file for some common functions used all over the addon
 *
 * @package OTP\Notifications\WcSMSNotification
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

use OTP\Helper\MoUtility;

define( 'MSN_DIR', plugin_dir_path( __FILE__ ) );
define( 'MSN_URL', plugin_dir_url( __FILE__ ) );
define( 'MSN_VERSION', '1.0.0' );
define( 'WC_MSN_JS_URL', MSN_URL . 'includes/js/mo_wc_settings.js' );


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
 * @param string      $string_value - option name.
 * @param bool|string $prefix - prefix for database keys.
 * @return string
 */
function get_wc_option( $string_value, $prefix = null ) {

	// Input validation.
	if ( ! is_string( $string_value ) || empty( $string_value ) ) {
		return '';
	}

	// Sanitize inputs.
	$string_value = sanitize_key( wp_unslash( $string_value ) );
	$prefix       = ( null === $prefix ) ? 'mo_wc_sms_' : sanitize_key( wp_unslash( $prefix ) );

	$option_name = $prefix . $string_value;
	return get_mo_option( $option_name, '' );
}

/**
 * This function is used to handle the add-ons update option call. A separate function has been created so that
 * we can manage getting of database values all from one place. Any changes need to be made can be made here
 * rather than having to make changes in all of the add-on files.
 *
 * Calls the mains plugins update_mo_option function.
 *
 * @param string      $option_name - key of the option name.
 * @param string      $value - value of the option.
 * @param null|string $prefix - prefix of the key for database entry.
 */
function update_wc_option( $option_name, $value, $prefix = null ) {

	// Input validation.
	if ( ! is_string( $option_name ) || empty( $option_name ) ) {
		return;
	}

	// Sanitize inputs.
	$option_name = sanitize_key( wp_unslash( $option_name ) );
	$prefix      = ( null === $prefix ) ? 'mo_wc_sms_' : sanitize_key( wp_unslash( $prefix ) );

	// Sanitize value based on type.
	if ( is_string( $value ) ) {
		$value = sanitize_text_field( wp_unslash( $value ) );
	} elseif ( is_array( $value ) ) {
		$value = MoUtility::mo_sanitize_array( wp_unslash( $value ) );
	}

	$full_option_name = $prefix . $option_name;
	update_mo_option( $full_option_name, $value, '' );
}
