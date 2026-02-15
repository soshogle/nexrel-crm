<?php
/**
 * Loads admin view for ContactForm7.
 *
 * @package miniorange-otp-verification/controllers/forms
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

use OTP\Handler\Forms\ContactForm7;
use OTP\Helper\MoUtility;

$handler          = ContactForm7::instance();
$cf7_enabled      = (bool) $handler->is_form_enabled() ? 'checked' : '';
$cf7_hidden       = 'checked' === $cf7_enabled ? '' : 'hidden';
$cf7_enabled_type = $handler->get_otp_type_enabled();
$cf7_field_list   = admin_url() . 'admin.php?page=wpcf7';
$cf7_field_key    = $handler->get_email_key_details();
$cf7_type_phone   = $handler->get_phone_html_tag();
$cf7_type_email   = $handler->get_email_html_tag();
$form_name        = $handler->get_form_name();

$view_file_path = MOV_DIR . 'views/forms/mocontactform7.php';
if ( MoUtility::mo_require_file( $view_file_path, MOV_DIR ) ) {
	require $view_file_path;
}
get_plugin_form_link( $handler->get_form_documents() );
