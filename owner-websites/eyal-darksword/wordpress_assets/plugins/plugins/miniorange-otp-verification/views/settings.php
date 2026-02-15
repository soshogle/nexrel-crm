<?php
/**
 * Load admin view for settings of Configured Forms.
 *
 * @package miniorange-otp-verification/views
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

use OTP\Helper\MoUtility;

echo '	
			<form name="f" method="post" action="' . esc_url( $moaction ) . '" id="mo_otp_verification_settings">
			    <input type="hidden" id="error_message" name="error_message" value="" />
				<input type="hidden" name="option" value="mo_customer_validation_settings" />';

					wp_nonce_field( $nonce );
if ( $form_name && ! $show_configured_forms ) {
	$formsettings_file = MOV_DIR . 'views/formsettings.php';
	if ( MoUtility::mo_require_file( $formsettings_file, MOV_DIR ) ) {
		include $formsettings_file;
	}
} else {
	$formlist_file = MOV_DIR . 'views/formlist.php';
	if ( MoUtility::mo_require_file( $formlist_file, MOV_DIR ) ) {
		include $formlist_file;
	}
}
$configuredforms_file = MOV_DIR . 'views/configuredforms.php';
if ( MoUtility::mo_require_file( $configuredforms_file, MOV_DIR ) ) {
	require $configuredforms_file;
}

echo '		</form>';
