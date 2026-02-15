<?php
/**
 * Load admin view for WPFormsPlugin.
 *
 * @package miniorange-otp-verification/controllers/forms
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

use OTP\Handler\Forms\WPFormsPlugin;
use OTP\Helper\MoUtility;

$handler                          = WPFormsPlugin::instance();
$is_wpform_enabled                = (bool) $handler->is_form_enabled() ? 'checked' : '';
$is_wpform_hidden                 = 'checked' === $is_wpform_enabled ? '' : 'style="display:none;"';
$wpform_enabled_type              = $handler->get_otp_type_enabled();
$wpform_list_of_forms_otp_enabled = $handler->get_form_details();
$wpform_form_list                 = admin_url() . 'admin.php?page=wpforms-overview';
$button_text                      = ! empty( $handler->get_button_text() ) ? $handler->get_button_text() : __( 'Click Here to send OTP', 'miniorange-otp-verification' );
$wpform_phone_type                = $handler->get_phone_html_tag();
$wpform_email_type                = $handler->get_email_html_tag();
$wpform_both_type                 = $handler->get_both_html_tag();
$form_name                        = $handler->get_form_name();
$enter_otp_text                   = ! empty( $handler->get_enter_otp_field_text() ) ? $handler->get_enter_otp_field_text() : __( 'Enter OTP Here', 'miniorange-otp-verification' );
$verify_button_text               = ! empty( $handler->get_verify_button_text() ) ? $handler->get_verify_button_text() : __( 'Verify OTP', 'miniorange-otp-verification' );

$view_file_path = MOV_DIR . 'views/forms/mowpformsplugin.php';
if ( MoUtility::mo_require_file( $view_file_path, MOV_DIR ) ) {
	require $view_file_path;
}
get_plugin_form_link( $handler->get_form_documents() );
