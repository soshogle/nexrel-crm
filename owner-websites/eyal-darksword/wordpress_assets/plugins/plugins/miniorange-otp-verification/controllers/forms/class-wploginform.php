<?php
/**
 * Load admin view for WPLoginForm.
 *
 * @package miniorange-otp-verification/controllers/forms
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

use OTP\Handler\Forms\WPLoginForm;
use OTP\Helper\MoUtility;

$handler                     = WPLoginForm::instance();
$wp_login_enabled            = (bool) $handler->is_form_enabled() ? 'checked' : '';
$wp_login_hidden             = 'checked' === $wp_login_enabled ? '' : 'style="display:none"';
$wp_login_enabled_type       = (bool) $handler->mo_save_phone_numbers() ? 'checked' : '';
$wp_login_field_key          = $handler->get_phone_key_details();
$wp_login_admin              = (bool) $handler->mo_by_pass_check_for_admins() ? 'checked' : '';
$wp_login_with_phone         = (bool) $handler->mo_allow_login_through_phone() ? 'checked' : '';
$wp_handle_duplicates        = (bool) $handler->restrict_duplicates() ? 'checked' : '';
$wp_enabled_type             = $handler->get_otp_type_enabled();
$wp_phone_type               = $handler->get_phone_html_tag();
$wp_email_type               = $handler->get_email_html_tag();
$form_name                   = $handler->get_form_name();
$skip_pass                   = $handler->mo_get_skip_password_check() ? 'checked' : '';
$skip_pass_fallback_div      = $handler->mo_get_skip_password_check() ? 'block' : 'hidden';
$skip_pass_fallback          = $handler->mo_get_skip_password_check_fallback() ? 'checked' : '';
$user_field_text             = ! empty( $handler->mo_get_user_label() ) ? $handler->mo_get_user_label() : __( 'Username, E-mail or Phone No.', 'miniorange-otp-verification' );
$otpd_enabled                = $handler->mo_is_delay_otp() ? 'checked' : '';
$otpd_enabled_div            = $handler->mo_is_delay_otp() ? 'block' : 'hidden';
$otpd_time_interval          = $handler->mo_get_delay_otp_interval();
$redirect_page               = $handler->mo_redirect_to_page();
$redirection_after_login     = $handler->mo_select_redirection_after_login();
$login_with_otp_button_text  = ! empty( $handler->mo_get_login_with_otp_button_text() ) ? $handler->mo_get_login_with_otp_button_text() : __( 'Login with OTP', 'miniorange-otp-verification' );
$login_with_pass_button_text = ! empty( $handler->mo_get_login_with_pass_button_text() ) ? $handler->mo_get_login_with_pass_button_text() : __( 'Login with Password', 'miniorange-otp-verification' );
$login_with_pass_button_css  = $handler->mo_get_login_with_pass_button_css();
$wp_default_redirect         = 'redirect_to_default';
$wp_redirect_to_page         = 'redirect_to_the_page';
$redirect_page_id            = 0;
if ( ! MoUtility::is_blank( $redirect_page ) ) {
	if ( is_numeric( $redirect_page ) ) {
		$otp_page = get_post( absint( $redirect_page ) );
		if ( $otp_page && 'page' === $otp_page->post_type ) {
			$redirect_page_id = $otp_page->ID;
		}
	} else {
		$otp_pages = get_posts(
			array(
				'title'       => $redirect_page,
				'post_type'   => 'page',
				'numberposts' => 1,
			)
		);
		if ( ! empty( $otp_pages ) && isset( $otp_pages[0]->ID ) ) {
			$redirect_page_id = $otp_pages[0]->ID;
		}
	}
}
$view_file_path = MOV_DIR . 'views/forms/mowploginform.php';
if ( MoUtility::mo_require_file( $view_file_path, MOV_DIR ) ) {
	require $view_file_path;
}
get_plugin_form_link( $handler->get_form_documents() );
