<?php
/**
 * Loads admin view for EverestContactForm.
 *
 * @package miniorange-otp-verification/controllers/forms
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

use OTP\Helper\MoUtility;
use OTP\Handler\Forms\EverestContactForm;

$handler                                   = EverestContactForm::instance();
$is_everest_contact_enabled                = (bool) $handler->is_form_enabled() ? 'checked' : '';
$is_everest_contact_hidden                 = 'checked' === $is_everest_contact_enabled ? '' : 'hidden';
$everest_contact_enabled_type              = $handler->get_otp_type_enabled();
$everest_contact_list_of_forms_otp_enabled = $handler->get_form_details();
$everest_contact_form_list                 = admin_url() . 'admin.php?page=evf-builder';
$button_text                               = ! empty( $handler->get_button_text() ) ? $handler->get_button_text() : __( 'Click Here to send OTP', 'miniorange-otp-verification' );
$everest_contact_phone_type                = $handler->get_phone_html_tag();
$everest_contact_email_type                = $handler->get_email_html_tag();
$form_name                                 = $handler->get_form_name();

$view_file = MOV_DIR . 'views/forms/moeverestcontactform.php';
if ( ! MoUtility::mo_require_file( $view_file, MOV_DIR ) ) {
	return;
}
require_once $view_file;
get_plugin_form_link( $handler->get_form_documents() );
