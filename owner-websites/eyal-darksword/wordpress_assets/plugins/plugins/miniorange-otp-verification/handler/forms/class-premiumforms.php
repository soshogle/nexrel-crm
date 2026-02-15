<?php
/**
 * Load admin view for Elementor Pro Form.
 *
 * @package miniorange-otp-verification/handler/forms
 */

namespace OTP\Handler\Forms;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}
use OTP\Objects\FormHandler;
use OTP\Objects\IFormHandler;
use OTP\Traits\Instance;
use OTP\Helper\MoFormDocs;
use OTP\Helper\PremiumFeatureList;

/**
 * This is the Elementor Pro Free class. This class handles all the
 * functionality related to Elementor Pro Free Form. It extends the FormHandler
 * and implements the IFormHandler class to implement some much needed functions.
 */
if ( ! class_exists( 'PremiumForms' ) ) {
	/**
	 * PremiumForms class
	 */
	class PremiumForms extends FormHandler implements IFormHandler {
		use Instance;

		/**
		 * Constructor to declare variables of the class on initialization
		 **/
		protected function __construct() {
			$this->form_name = '';
			$path            = ! empty( $_SERVER['REQUEST_URI'] ) ? sanitize_text_field( wp_unslash( $_SERVER['REQUEST_URI'] ) ) : '';
			$query_str       = wp_parse_url( $path, PHP_URL_QUERY );
			if ( $query_str ) {
				parse_str( $query_str, $query_params );
				if ( ! empty( $query_params['form_name']['name'] ) ) {
					$this->form_name = sanitize_text_field( $query_params['form_name']['name'] );
				}
				unset( $query_params );
			}
			$this->form_documents = MoFormDocs::PREMIUM_FORM_LINK;
			parent::__construct();
		}
		/**
		 * Function checks if form has been enabled by the admin and initializes
		 * all the class variables. This function also defines all the hooks to
		 * hook into to make OTP Verification possible.
		 **/
		public function handle_form() {
			return '';
		}

		/**
		 * This function hooks into the otp_verification_failed hook. This function
		 * details what is done if the OTP verification fails.
		 *
		 * @param string $user_login the username posted by the user.
		 * @param string $user_email the email posted by the user.
		 * @param string $phone_number the phone number posted by the user.
		 * @param string $otp_type the verification type.
		 */
		public function handle_failed_verification( $user_login, $user_email, $phone_number, $otp_type ) {
			return '';
		}
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
		public function handle_post_verification( $redirect_to, $user_login, $user_email, $password, $phone_number, $extra_data, $otp_type ) {
			return '';
		}

		/**
		 * Unset all the session variables so that a new form submission starts
		 * a fresh process of OTP verification.
		 */
		public function unset_otp_session_variables() {
			return '';
		}

		/**
		 * This function is called by the filter mo_phone_dropdown_selector
		 * to return the Jquery selector of the phone field. The function will
		 * push the formID to the selector array if OTP Verification for the
		 * form has been enabled.
		 *
		 * @param  array $selector the Jquery selector to be modified.
		 * @return array The selector
		 */
		public function get_phone_number_selector( $selector ) {
			return $selector;
		}
		/**
		 * Handles saving all the Eduma Theme form related options by the admin.
		 */
		public function handle_form_options() {
			return '';
		}
	}
}
