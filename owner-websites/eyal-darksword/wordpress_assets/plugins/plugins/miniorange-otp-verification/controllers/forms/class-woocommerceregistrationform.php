<?php
/**
 * Load admin view for WooCommerceRegistrationForm.
 *
 * @package miniorange-otp-verification/controllers/forms
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

use OTP\Handler\Forms\WooCommerceRegistrationForm;
use OTP\Helper\MoUtility;

$handler                  = WooCommerceRegistrationForm::instance();
$woocommerce_registration = (bool) $handler->is_form_enabled() ? 'checked' : '';
$wc_hidden                = 'checked' === $woocommerce_registration ? '' : 'style=display:none';
$wc_enable_type           = $handler->get_otp_type_enabled();
$wc_restrict_duplicates   = (bool) $handler->restrict_duplicates() ? 'checked' : '';
$wc_reg_type_phone        = $handler->get_phone_html_tag();
$wc_reg_type_email        = $handler->get_email_html_tag();
$wc_reg_type_both         = $handler->get_both_html_tag();
$form_name                = $handler->get_form_name();
$redirect_page            = $handler->redirectToPage();
$redirect_page_id         = '';
if ( ! MoUtility::is_blank( $redirect_page ) ) {
	$redirect_page_id = MoUtility::mo_get_page_id_by_title( $redirect_page, 'all' );
}
$is_ajax_form         = $handler->is_ajax_form();
$is_ajax_mode_enabled = $is_ajax_form ? 'checked' : '';
$wc_button_text       = ! empty( $handler->get_button_text() ) ? $handler->get_button_text() : __( 'Click Here to send OTP', 'miniorange-otp-verification' );

$is_redirect_after_registration_enabled = $handler->isredirectToPageEnabled() ? 'checked' : '';

$view_file_path = MOV_DIR . 'views/forms/mowoocommerceregistrationform.php';
if ( MoUtility::mo_require_file( $view_file_path, MOV_DIR ) ) {
	require $view_file_path;
}
get_plugin_form_link( $handler->get_form_documents() );
