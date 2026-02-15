<?php
/**
 * Load admin view for MemberPressSingleCheckoutForm.
 *
 * @package miniorange-otp-verification/controllers/forms
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

use OTP\Handler\Forms\MemberPressSingleCheckoutForm;
use OTP\Helper\MoUtility;

$handler                   = MemberPressSingleCheckoutForm::instance();
$mrp_single_registration   = $handler->is_form_enabled() ? 'checked' : '';
$mrp_single_default_hidden = 'checked' === $mrp_single_registration ? '' : 'style="display:none"';
$mrp_single_default_type   = $handler->get_otp_type_enabled();
$mrp_single_field_key      = $handler->get_phone_key_details();
$mrp_single_fields         = admin_url() . 'admin.php?page=memberpress-options#mepr-fields';
$mrp_singlereg_phone_type  = $handler->get_phone_html_tag();
$mrp_singlereg_email_type  = $handler->get_email_html_tag();
$mrp_singlereg_both_type   = $handler->get_both_html_tag();
$form_name                 = $handler->get_form_name();
$mpr_single_anon_only      = $handler->bypass_for_logged_in_users() ? 'checked' : '';

$view_file = MOV_DIR . 'views/forms/momemberpresssinglecheckoutform.php';
if ( ! MoUtility::mo_require_file( $view_file, MOV_DIR ) ) {
	return;
}
require_once $view_file;
get_plugin_form_link( $handler->get_form_documents() );
