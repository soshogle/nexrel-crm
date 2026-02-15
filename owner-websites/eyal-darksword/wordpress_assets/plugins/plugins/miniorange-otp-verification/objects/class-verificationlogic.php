<?php
/**Load Abstract Class VerificationLogic
 *
 * @package miniorange-otp-verification/objects
 */

namespace OTP\Objects;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

use OTP\Helper\MoUtility;
/**
 * Interface class that's extended by the email nd phone logic classes.
 * It defines some of the common actions and functions for each of those
 * classes.
 */
if ( ! class_exists( 'VerificationLogic' ) ) {
	/**
	 * VerificationLogic class
	 */
	abstract class VerificationLogic {

		// Some abstract functions that needs to implemented by each logic class.
		/**
		 * This function is called to handle Email Verification request. Processes
		 * the request and starts the OTP Verification process. Starts of with
		 * checking if the phone number is in the requested format.
		 *
		 * @param string $user_login    username of the user.
		 * @param string $user_email    email of the user.
		 * @param string $phone_number  phone number of the user.
		 * @param string $otp_type      email or sms verification.
		 * @param string $from_both     has user enabled from both.
		 * @return void
		 */
		abstract public function handle_logic( $user_login, $user_email, $phone_number, $otp_type, $from_both );

		/**
		 * This function is called to handle what needs to be done when OTP sending is successful.
		 * Checks if the current form is an AJAX form and decides what message has to be
		 * shown to the user.
		 *
		 * @param string $user_login    username of the user.
		 * @param string $user_email    email of the user.
		 * @param string $phone_number  phone number of the user.
		 * @param string $otp_type      email or sms verification.
		 * @param string $from_both     has user enabled from both.
		 * @param array  $content       string the json decoded response from server.
		 * @return void
		 */
		abstract public function handle_otp_sent( $user_login, $user_email, $phone_number, $otp_type, $from_both, $content );

		/**
		 * This function is called to handle what needs to be done when OTP sending fails.
		 * Checks if the current form is an AJAX form and decides what message has to be
		 * shown to the user.
		 *
		 * @param string $user_login    username of the user.
		 * @param string $user_email    email of the user.
		 * @param string $phone_number  phone number of the user.
		 * @param string $otp_type      email or sms verification.
		 * @param string $from_both     has user enabled from both.
		 * @param array  $content       string the json decoded response from server.
		 * @return void
		 */
		abstract public function handle_otp_sent_failed( $user_login, $user_email, $phone_number, $otp_type, $from_both, $content );

		/**
		 * Get the success message to be shown to the user when OTP was sent
		 * successfully. If admin has set his own unique message then
		 * show that to the user instead of the default one.
		 *
		 * @return string
		 */
		abstract public function get_otp_sent_message();

		/**
		 * Get the error message to be shown to the user when there was an
		 * error sending OTP. If admin has set his own unique message then
		 * show that to the user instead of the default one.
		 *
		 * @return string
		 */
		abstract public function get_otp_sent_failed_message();

		/**
		 * Function decides what message needs to be sent to the user when the
		 * phone number does not match the required format. It checks if the admin
		 * has set any message in the plugin settings and returns that instead of the
		 * default one.
		 *
		 * @return string
		 */
		abstract public function get_otp_invalid_format_message();

		/**
		 * Function decides what message needs to be shown to the user when he enters a
		 * blocked phone number. It checks if the admin has set any message in the
		 * plugin settings and returns that instead of the default one.
		 *
		 * @return string
		 */
		abstract public function get_is_blocked_message();

		/**
		 * This function starts the OTP Verification process if phone number matches the
		 * correct format and is not blocked by the admin.
		 *
		 * @param string $user_login    username of the user.
		 * @param string $user_email    email of the user.
		 * @param string $phone_number  phone number of the user.
		 * @param string $otp_type      email or sms verification.
		 * @param string $from_both     string has user enabled from both.
		 * @return void
		 */
		abstract public function handle_matched( $user_login, $user_email, $phone_number, $otp_type, $from_both );

		/**
		 * This function handles what message needs to be shown to the user if phone number
		 * doesn't match the correct format. Check if admin has set any message, and check
		 * if the form is an ajax form to show the message in the correct format.
		 *
		 * @param string $phone_number  the phone number being processed.
		 * @param string $otp_type      email or sms verification.
		 * @param string $from_both     has user enabled from both.
		 * @return void
		 */
		abstract public function handle_not_matched( $phone_number, $otp_type, $from_both );

		/**
		 * This function starts the OTP Verification process and contacts server to send OTP to the
		 * user's phone number.
		 *
		 * @param string $user_login    username of the user.
		 * @param string $user_email    email of the user.
		 * @param string $phone_number  phone number of the user.
		 * @param string $otp_type      email or sms verification.
		 * @param string $from_both     string has user enabled from both.
		 * @return void
		 */
		abstract public function start_otp_verification( $user_login, $user_email, $phone_number, $otp_type, $from_both );

		/**
		 * This function checks if the phone number has been blocked by the admin
		 *
		 * @param string $user_email     email of the user.
		 * @param string $phone_number   phone number of the user.
		 * @return bool
		 */
		abstract public function is_blocked( $user_email, $phone_number );

		/**
		 * Static function to detect if the current form being submitted for which
		 * OTP Verification has started is an AJAX form.
		 *
		 * @return bool
		 */
		public static function is_ajax_form() {
			$request_var = MoUtility::get_current_page_parameter_value( 'mo_external_popup_option', '' );
			if ( isset( $request_var ) &&
				in_array( sanitize_text_field( wp_unslash( $request_var ) ), array( 'miniorange-ajax-otp-generate', 'miniorange-ajax-otp-validate', 'mo_ajax_form_validate' ), true ) ) {
				return true;
			}
			return (bool) apply_filters( 'is_ajax_form', false );
		}
	}
}
