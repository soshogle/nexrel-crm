<?php
/**
 * Load admin view for NinjaFormAjaxForm.
 *
 * @package miniorange-otp-verification/controllers/forms
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

use OTP\Handler\Forms\NinjaFormAjaxForm;
use OTP\Helper\MoUtility;

$handler                      = NinjaFormAjaxForm::instance();
$ninja_ajax_form_enabled      = $handler->is_form_enabled() ? 'checked' : '';
$ninja_ajax_form_hidden       = 'checked' === $ninja_ajax_form_enabled ? '' : ' style="display:none"';
$ninja_ajax_form_enabled_type = $handler->get_otp_type_enabled();
$ninja_ajax_form_list         = admin_url() . 'admin.php?page=ninja-forms';
$ninja_ajax_form_otp_enabled  = $handler->get_form_details();
$ninja_ajax_form_type_phone   = $handler->get_phone_html_tag();
$ninja_ajax_form_type_email   = $handler->get_email_html_tag();
$button_text                  = ! empty( $handler->get_button_text() ) ? $handler->get_button_text() : __( 'Click Here to send OTP', 'miniorange-otp-verification' );
$form_name                    = $handler->get_form_name();

$view_file_path = MOV_DIR . 'views/forms/moninjaformajaxform.php';
if ( MoUtility::mo_require_file( $view_file_path, MOV_DIR ) ) {
	require $view_file_path;
}
get_plugin_form_link( $handler->get_form_documents() );
