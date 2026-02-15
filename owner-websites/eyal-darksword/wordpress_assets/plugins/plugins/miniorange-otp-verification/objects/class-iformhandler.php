<?php
/**Load Interface IFormHandler
 *
 * @package miniorange-otp-verification/objects
 */

namespace OTP\Objects;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

interface IFormHandler {

	// function to be defined by the form class implementing this interface.
	/**
	 * MoInternal Function
	 *
	 * @return mixed
	 */
	public function unset_otp_session_variables();

	/**
	 * This function hooks into the otp_verification_successful hook. This function is
	 * details what needs to be done if OTP Verification is successful.
	 *
	 * @param string $redirect_to the redirect to URL after new user registration.
	 * @param string $user_login the username posted by the user.
	 * @param string $user_email the email posted by the user.
	 * @param string $password the password posted by the user.
	 * @param string $phone_number the phone number posted by the user.
	 * @param string $extra_data any extra data posted by the user.
	 * @param string $otp_type the verification type.
	 */
	public function handle_post_verification( $redirect_to, $user_login, $user_email, $password, $phone_number, $extra_data, $otp_type );

	/**
	 * This function hooks into the otp_verification_failed hook. This function
	 * details what is done if the OTP verification fails.
	 *
	 * @param string $user_login the username posted by the user.
	 * @param string $user_email the email posted by the user.
	 * @param string $phone_number the phone number posted by the user.
	 * @param string $otp_type the verification type.
	 */
	public function handle_failed_verification( $user_login, $user_email, $phone_number, $otp_type );

	/**
	 * Function checks if form has been enabled by the admin and initializes
	 * all the class variables. This function also defines all the hooks to
	 * hook into to make OTP Verification possible.
	 *
	 * @throws ReflectionException .
	 */
	public function handle_form();

	/**
	 * Handles saving all the Form related options by the admin.
	 */
	public function handle_form_options();

	/**
	 * This function is called by the filter mo_phone_dropdown_selector
	 * to return the Jquery selector of the phone field. The function will
	 * push the formID to the selector array if OTP Verification for the
	 * form has been enabled.
	 *
	 * @param  array $selector - the Jquery selector to be modified.
	 * @return array
	 */
	public function get_phone_number_selector( $selector );

	/**
	 * MoInternal Function
	 *
	 * @param mixed $is_login_or_social_form check if login form.
	 * @return mixed
	 */
	public function is_login_or_social_form( $is_login_or_social_form );

	/**
	 * Note : functions below are implemented by the FormHandler class
	 *
	 * @param bool $is_ajax check if ajax form.
	 */
	public function is_ajax_form_in_play( $is_ajax );

	/**
	 * MoInternal Function
	 *
	 * @return mixed
	 */
	public function get_phone_html_tag();

	/**
	 * MoInternal Function
	 *
	 * @return mixed
	 */
	public function get_email_html_tag();

	/**
	 * MoInternal Function
	 *
	 * @return mixed
	 */
	public function get_both_html_tag();

	/**
	 * MoInternal Function
	 *
	 * @return mixed
	 */
	public function get_form_key();

	/**
	 * MoInternal Function
	 *
	 * @return mixed
	 */
	public function get_form_name();

	/**
	 * MoInternal Function
	 *
	 * @return mixed
	 */
	public function get_otp_type_enabled();

	/**
	 * MoInternal Function
	 *
	 * @return mixed
	 */
	public function disable_auto_activation();

	/**
	 * MoInternal Function
	 *
	 * @return mixed
	 */
	public function get_phone_key_details();

	/**
	 * MoInternal Function
	 *
	 * @return mixed
	 */
	public function is_form_enabled();

	/**
	 * MoInternal Function
	 *
	 * @return mixed
	 */
	public function get_email_key_details();

	/**
	 * MoInternal Function
	 *
	 * @return mixed
	 */
	public function get_button_text();

	/**
	 * MoInternal Function
	 *
	 * @return mixed
	 */
	public function get_button_css();

	/**
	 * MoInternal Function
	 *
	 * @return mixed
	 */
	public function get_form_details();

	/**
	 * MoInternal Function
	 *
	 * @return mixed
	 */
	public function get_verification_type();

	/**
	 * MoInternal Function
	 *
	 * @return mixed
	 */
	public function get_form_documents();
}
