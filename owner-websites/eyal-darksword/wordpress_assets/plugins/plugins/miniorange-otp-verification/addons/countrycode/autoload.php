<?php
/**
 * Autoload file for some common functions used all over the addon
 *
 * @package miniorange-otp-verification/addons/countrycode
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

if ( ! defined( 'MO_SC_DIR' ) ) {
	define( 'MO_SC_DIR', plugin_dir_path( __FILE__ ) );
}

if ( ! defined( 'MO_SC_URL' ) ) {
	define( 'MO_SC_URL', plugin_dir_url( __FILE__ ) );
}
/**
 * This function is used to handle the add-ons get option call. A separate function has been created so that
 * we can manage getting of database values all from one place. Any changes need to be made can be made here
 * rather than having to make changes in all of the add-on files.
 *
 * Calls the mains plugins get_mo_option function.
 *
 * @param string      $option_key - option name.
 * @param string|null $prefix - prefix for database keys.
 * @return string
 */
function mo_get_sc_option( $option_key, $prefix = null ) {
	if ( ! is_string( $option_key ) ) {
		return '';
	}

	$option_key  = sanitize_key( wp_unslash( $option_key ) );
	$prefix      = null === $prefix ? 'mo_sc_code_' : sanitize_key( wp_unslash( $prefix ) );
	$option_name = $prefix . $option_key;

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
 * @param mixed       $value - value of the option.
 * @param string|null $prefix - prefix of the key for database entry.
 */
function mo_update_sc_option( $option_name, $value, $prefix = null ) {
	if ( ! is_string( $option_name ) ) {
		return;
	}

	$option_name      = sanitize_key( wp_unslash( $option_name ) );
	$prefix           = null === $prefix ? 'mo_sc_code_' : sanitize_key( wp_unslash( $prefix ) );
	$full_option_name = $prefix . $option_name;

	update_mo_option( $full_option_name, $value, '' );
}
