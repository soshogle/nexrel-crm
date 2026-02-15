<?php
/**
 * Load the Ultimate Member SMS Notification addon.
 *
 * @package miniorange-otp-verification/notifications/umsmsnotification
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'UMSN_DIR', plugin_dir_path( __FILE__ ) );
define( 'UMSN_URL', plugin_dir_url( __FILE__ ) );
define( 'UMSN_VERSION', '1.0.0' );

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
 * @param string $option_name - option name.
 * @param bool   $prefix - prefix of option name.
 * @return String
 */
function get_umsn_option( $option_name, $prefix = null ) {
	$option_name = ( null === $prefix ? 'mo_um_sms_' : $prefix ) . $option_name;
	return get_mo_option( $option_name, '' );
}

/**
 * This function is used to handle the add-ons update option call. A separate function has been created so that
 * we can manage getting of database values all from one place. Any changes need to be made can be made here
 * rather than having to make changes in all of the add-on files.
 *
 * Calls the mains plugins get_mo_option function.
 *
 * @param string $option_name - option name.
 * @param string $value - value of option name.
 * @param null   $prefix - prefix before option name.
 */
function update_umsn_option( $option_name, $value, $prefix = null ) {
	$option_name = ( null === $prefix ? 'mo_um_sms_' : $prefix ) . $option_name;
	update_mo_option( $option_name, $value, '' );
}
