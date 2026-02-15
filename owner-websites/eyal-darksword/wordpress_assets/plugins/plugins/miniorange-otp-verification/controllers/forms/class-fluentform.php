<?php
/**
 * Load admin view for fluentformsPlugin.
 *
 * @package miniorange-otp-verification/controllers/forms
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

use OTP\Helper\MoUtility;
use OTP\Handler\Forms\FluentForm;

$handler                              = FluentForm::instance();
$is_fluentform_enabled                = (bool) $handler->is_form_enabled() ? 'checked' : '';
$is_fluentform_hidden                 = 'checked' === $is_fluentform_enabled ? '' : ' style="display:none;"';
$fluentform_enabled_type              = $handler->get_otp_type_enabled();
$fluentform_list_of_forms_otp_enabled = $handler->get_form_details();
$fluentform_form_list                 = admin_url() . 'admin.php?page=fluent_forms';
$fluentform_phone_type                = $handler->get_phone_html_tag();
$fluentform_email_type                = $handler->get_email_html_tag();
$fluentform_both_type                 = $handler->get_both_html_tag();
$form_name                            = $handler->get_form_name();

$view_file = MOV_DIR . 'views/forms/fluentform.php';
if ( ! MoUtility::mo_require_file( $view_file, MOV_DIR ) ) {
	return;
}
require_once $view_file;
get_plugin_form_link( $handler->get_form_documents() );
