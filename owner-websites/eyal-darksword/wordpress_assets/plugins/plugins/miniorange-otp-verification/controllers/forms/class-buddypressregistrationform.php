<?php
/**
 * Loads admin view for BuddyPressRegistrationForm.
 *
 * @package miniorange-otp-verification/controllers/forms
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

use OTP\Handler\Forms\BuddyPressRegistrationForm;
use OTP\Helper\MoUtility;


$handler              = BuddyPressRegistrationForm::instance();
$bbp_enabled          = $handler->is_form_enabled() ? 'checked' : '';
$bbp_hidden           = 'checked' === $bbp_enabled ? '' : 'hidden';
$bbp_enable_type      = $handler->get_otp_type_enabled();
$bbp_fields           = admin_url() . 'users.php?page=bp-profile-setup';
$bbp_field_key        = $handler->get_phone_key_details();
$automatic_activation = $handler->disable_auto_activation() ? 'checked' : '';
$bbp_type_phone       = $handler->get_phone_html_tag();
$bbp_type_email       = $handler->get_email_html_tag();
$bbp_type_both        = $handler->get_both_html_tag();
$form_name            = $handler->get_form_name();
$restrict_duplicates  = $handler->restrict_duplicates() ? 'checked' : '';

$view_file_path = MOV_DIR . 'views/forms/mobuddypressregistrationform.php';
if ( MoUtility::mo_require_file( $view_file_path, MOV_DIR ) ) {
	require $view_file_path;
}
get_plugin_form_link( $handler->get_form_documents() );
