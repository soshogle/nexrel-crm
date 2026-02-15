<?php
/**
 * Load admin view for GravityForm.
 *
 * @package miniorange-otp-verification/controllers/forms
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

use OTP\Handler\Forms\GravityForm;
use OTP\Helper\MoUtility;

$handler         = GravityForm::instance();
$gf_enabled      = $handler->is_form_enabled() ? 'checked' : '';
$gf_hidden       = 'checked' === $gf_enabled ? '' : ' style="display:none;"';
$gf_enabled_type = $handler->get_otp_type_enabled();
$gf_field_list   = admin_url() . 'admin.php?page=gf_edit_forms';
$gf_otp_enabled  = $handler->get_form_details();
$gf_type_email   = $handler->get_email_html_tag();
$gf_type_phone   = $handler->get_phone_html_tag();
$form_name       = $handler->get_form_name();
$gf_button_text  = ! empty( $handler->get_button_text() ) ? $handler->get_button_text() : __( 'Click Here to send OTP', 'miniorange-otp-verification' );
$gf_button_css   = $handler->get_button_css();

$view_file = MOV_DIR . 'views/forms/mogravityform.php';
if ( ! MoUtility::mo_require_file( $view_file, MOV_DIR ) ) {
	return;
}
require_once $view_file;
get_plugin_form_link( $handler->get_form_documents() );
