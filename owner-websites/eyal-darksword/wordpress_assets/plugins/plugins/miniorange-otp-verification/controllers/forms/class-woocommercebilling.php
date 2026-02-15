<?php
/**
 * Load admin view for WooCommerceBilling.
 *
 * @package miniorange-otp-verification/controllers/forms
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

use OTP\Handler\Forms\WooCommerceBilling;
use OTP\Helper\MoUtility;

$handler                 = WooCommerceBilling::instance();
$wc_billing_enable       = (bool) $handler->is_form_enabled() ? 'checked' : '';
$wc_billing_hidden       = 'checked' === $wc_billing_enable ? '' : 'hidden';
$wc_billing_type_enabled = $handler->get_otp_type_enabled();
$wc_billing_type_phone   = $handler->get_phone_html_tag();
$wc_billing_type_email   = $handler->get_email_html_tag();
$wc_restrict_duplicates  = (bool) $handler->restrict_duplicates() ? 'checked' : '';
$button_text             = ! empty( $handler->get_button_text() ) ? $handler->get_button_text() : __( 'Click Here to send OTP', 'miniorange-otp-verification' );
$form_name               = $handler->get_form_name();

$view_file_path = MOV_DIR . 'views/forms/mowoocommercebilling.php';
if ( MoUtility::mo_require_file( $view_file_path, MOV_DIR ) ) {
	require $view_file_path;
}
get_plugin_form_link( $handler->get_form_documents() );
