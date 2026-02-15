<?php
/**
 * Load admin view for FormidableForm.
 *
 * @package miniorange-otp-verification/controllers/forms
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

use OTP\Handler\Forms\FormidableForm;
use OTP\Helper\MoUtility;

$handler               = FormidableForm::instance();
$frm_form_enabled      = $handler->is_form_enabled() ? 'checked' : '';
$frm_form_hidden       = 'checked' === $frm_form_enabled ? '' : 'hidden';
$frm_form_enabled_type = $handler->get_otp_type_enabled();
$frm_form_list         = admin_url() . 'admin.php?page=formidable';
$frm_form_otp_enabled  = $handler->get_form_details();
$frm_form_type_phone   = $handler->get_phone_html_tag();
$frm_form_type_email   = $handler->get_email_html_tag();
$button_text           = ! empty( $handler->get_button_text() ) ? $handler->get_button_text() : __( 'Click Here to send OTP', 'miniorange-otp-verification' );
$form_name             = $handler->get_form_name();

$view_file = MOV_DIR . 'views/forms/moformidableform.php';
if ( ! MoUtility::mo_require_file( $view_file, MOV_DIR ) ) {
	return;
}
require_once $view_file;
get_plugin_form_link( $handler->get_form_documents() );
