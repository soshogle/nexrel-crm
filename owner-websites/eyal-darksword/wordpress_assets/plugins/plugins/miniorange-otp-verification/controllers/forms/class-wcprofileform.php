<?php
/**
 * Load admin view for WcProfileForm.
 *
 * @package miniorange-otp-verification/controllers/forms
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

use OTP\Handler\Forms\WcProfileForm;
use OTP\Helper\MoUtility;

$handler                    = WcProfileForm::instance();
$wc_acc_enabled             = $handler->is_form_enabled() ? 'checked' : '';
$wc_acc_hidden              = 'checked' === $wc_acc_enabled ? '' : 'hidden';
$wc_acc_enabled_type        = $handler->get_otp_type_enabled();
$wc_profile_field_key       = $handler->get_phone_key_details();
$wc_acc_forms               = admin_url() . 'my-account/edit-account/';
$wc_acc_type_phone          = $handler->get_phone_html_tag();
$wc_acc_type_email          = $handler->get_email_html_tag();
$wc_acc_restrict_duplicates = $handler->restrict_duplicates() ? 'checked' : '';
$form_name                  = $handler->get_form_name();
$wc_acc_button_text         = ! empty( $handler->get_button_text() ) ? $handler->get_button_text() : __( 'Click Here to send OTP', 'miniorange-otp-verification' );

$view_file_path = MOV_DIR . 'views/forms/mowcprofileform.php';
if ( MoUtility::mo_require_file( $view_file_path, MOV_DIR ) ) {
	require $view_file_path;
}
get_plugin_form_link( $handler->get_form_documents() );
