<?php
/**
 * Handles the OTP verification logic for Forminator form.
 *
 * @package miniorange-otp-verification/handler/forms
 */

namespace OTP\Handler\Forms;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}
use OTP\Helper\FormSessionVars;
use OTP\Helper\MoConstants;
use OTP\Helper\MoMessages;
use OTP\Helper\MoFormDocs;
use OTP\Helper\MoUtility;
use OTP\Helper\SessionUtils;
use OTP\Objects\FormHandler;
use OTP\Objects\IFormHandler;
use OTP\Objects\VerificationType;
use OTP\Traits\Instance;
use ReflectionException;
use WP_Error;

/**
 * This is the ForminatorForm Form class. This class handles all the
 * functionality related to the Form. It extends the FormHandler
 * and implements the IFormHandler class to implement some much needed functions.
 */
if ( ! class_exists( 'ForminatorForm' ) ) {
	/**
	 * ForminatorForm class
	 */
	class ForminatorForm extends FormHandler implements IFormHandler {

		use Instance;

		/**
		 * Initializes values
		 */
		protected function __construct() {
			$this->is_login_or_social_form = false;
			$this->is_ajax_form            = true;
			$this->form_session_var        = FormSessionVars::FORMINATOR;
			$this->type_phone_tag          = 'mo_forminator_phone_enable';
			$this->type_email_tag          = 'mo_forminator_email_enable';
			$this->form_key                = 'FORMINATOR';
			$this->form_name               = 'Forminator Forms';
			$this->is_form_enabled         = get_mo_option( 'forminator_enable' );
			$this->button_text             = get_mo_option( 'forminator_button_text' );
			$this->button_text             = ! MoUtility::is_blank( $this->button_text ) ? $this->button_text : '';
			$this->phone_form_id           = array();
			$this->form_documents          = MoFormDocs::FORMINATOR_FORM_LINK;
			$this->generate_otp_action     = 'miniorange_forminator_generate_otp';
			$this->validate_otp_action     = 'miniorange_forminator_validate_otp';
			parent::__construct();
		}

		/**
		 * Function checks if form has been enabled by the admin and initializes
		 * all the class variables. This function also defines all the hooks to
		 * hook into to make OTP Verification possible.
		 * */
		public function handle_form() {
			$this->otp_type     = get_mo_option( 'forminator_enable_type' );
			$this->form_details = maybe_unserialize( get_mo_option( 'forminator_forms' ) );
			if ( empty( $this->form_details ) ) {
				return;
			}
			if ( $this->otp_type === $this->type_phone_tag ) {
				foreach ( $this->form_details as $key => $value ) {
					array_push( $this->phone_form_id, '#forminator-module-' . $key . ' input[name=' . $value['phonekey'] . ']' );
				}
			}

			add_action( "wp_ajax_{$this->generate_otp_action}", array( $this, 'mo_send_otp' ) );
			add_action( "wp_ajax_nopriv_{$this->generate_otp_action}", array( $this, 'mo_send_otp' ) );
			add_action( 'wp_enqueue_scripts', array( $this, 'miniorange_register_forminator_script' ) );
			add_action( "wp_ajax_{$this->validate_otp_action}", array( $this, 'process_form_and_validate_otp' ) );
			add_action( "wp_ajax_nopriv_{$this->validate_otp_action}", array( $this, 'process_form_and_validate_otp' ) );
			add_filter( 'forminator_custom_form_submit_errors', array( $this, 'forminator_custom_form_submit_errors' ), 1, 3 );
			add_filter( 'forminator_form_ajax_submit_response', array( $this, 'forminator_form_ajax_submit_response' ), 1, 2 );
		}

		/**
		 * This function hooks into the forminator_form_ajax_submit_response hook
		 * to return the form submission errors.
		 *
		 * @param array $response - response return from the hook.
		 * @param array $form_id - Id of the form being processed.
		 */
		public function forminator_form_ajax_submit_response( $response, $form_id ) {
			if ( ! $response['success'] && array_key_exists( $form_id, $this->form_details ) ) {
				$response['message'] = $response['errors'][0];
			}
			if ( $response['success'] ) {
				$this->unset_otp_session_variables();
			}

			return $response;
		}

		/**
		 * This function hooks into the forminator_custom_form_submit_errors hook
		 * to return the form submission errors.
		 *
		 * @param array $submit_errors - Contains an array of errors to return.
		 * @param array $form_id - Id of the form being processed.
		 * @param array $field_data_array .
		 */
		public function forminator_custom_form_submit_errors( $submit_errors, $form_id, $field_data_array ) {

			if ( ! array_key_exists( $form_id, $this->form_details ) ) {
				return $submit_errors;
			}

			$mo_error = $this->mo_validation_checks( $submit_errors, $form_id, $field_data_array );

			if ( $mo_error ) {
				array_push( $submit_errors, $mo_error );
			}

			return $submit_errors;
		}

		/**
		 * This function returns the error while submission of form.
		 *
		 * @param array $submit_errors - Contains an array of errors to return.
		 * @param array $form_id - Id of the form being processed.
		 * @param array $field_data_array .
		 */
		public function mo_validation_checks( $submit_errors, $form_id, $field_data_array = '' ) {
			$mo_error = '';
			if ( ! SessionUtils::is_otp_initialized( $this->form_session_var ) ) {
				$mo_error = MoMessages::showMessage( MoMessages::ENTER_VERIFY_CODE );
			} elseif ( ! SessionUtils::is_status_match( $this->form_session_var, self::VALIDATED, $this->get_verification_type() ) ) {
				$mo_error = MoMessages::showMessage( MoMessages::PLEASE_VALIDATE );
			} else {
				$field_id    = $this->form_details[ $form_id ][ $this->get_verification_type() . 'key' ];
				$field_value = '';
				foreach ( $field_data_array as $key => $value ) {

					if ( $value['name'] === $field_id ) {
						$field_value = $value['value'];
						break;
					}
				}

				if ( array_key_exists( $form_id, $this->form_details ) && $this->get_verification_type() === 'phone' ) {
					$phone = MoUtility::process_phone_number( sanitize_text_field( $field_value ) );
					if ( ! SessionUtils::is_phone_verified_match( $this->form_session_var, $phone ) ) {
						$mo_error = MoMessages::showMessage( MoMessages::PHONE_MISMATCH );
					}
				} elseif ( ! SessionUtils::is_email_verified_match( $this->form_session_var, sanitize_email( wp_unslash( $field_value ) ) ) ) {
					$mo_error = MoMessages::showMessage( MoMessages::EMAIL_MISMATCH );
				}
			}

			return $mo_error;
		}

		/**
		 * This function is used
		 * to unset the final session variable if the OTP was successful.
		 *
		 * @param array $transdata array Array containing form/field data for Forminator.
		 */
		public function unset_session_variable( $transdata ) {
			if ( SessionUtils::is_status_match( $this->form_session_var, self::VALIDATED, $this->get_verification_type() ) ) {
				$this->unset_otp_session_variables();
			}
			return $transdata;
		}

		/**
		 * Checks if the verification has started or not and then validates the
		 * OTP submitted.
		 */
		public function process_form_and_validate_otp() {
			// Security: Use hardcoded nonce action 'form_nonce' and key 'security' instead of variables.
			if ( ! check_ajax_referer( 'form_nonce', 'security', false ) ) {
				wp_send_json(
					MoUtility::create_json(
						MoMessages::showMessage( MoMessages::INVALID_OP ),
						MoConstants::ERROR_JSON_TYPE
					)
				);
			}
			$data = MoUtility::mo_sanitize_array( wp_unslash( $_POST ) );

			$this->check_if_otp_sent();
			$this->check_integrity_and_validate_otp( $data );
		}

		/**
		 * Checks whether OTP sent or not.
		 */
		private function check_if_otp_sent() {
			if ( ! SessionUtils::is_otp_initialized( $this->form_session_var ) ) {
				wp_send_json(
					MoUtility::create_json(
						MoMessages::showMessage( MoMessages::ENTER_VERIFY_CODE ),
						MoConstants::ERROR_JSON_TYPE
					)
				);
			}
		}

		/**
		 * Check Integrity of the email or phone number. i.e. Ensure that the Email or
		 * Phone that the OTP was sent to is the same Email or Phone that is being submitted
		 * with the form.
		 * Once integrity check passes validate the OTP to ensure that the user has entered
		 * the correct OTP.
		 *
		 * @param array $data - this is the get / post data from the ajax call containing email or phone.
		 */
		private function check_integrity_and_validate_otp( $data ) {

			$this->check_integrity( $data );
			$this->validate_challenge( sanitize_text_field( $data['otpType'] ), null, sanitize_text_field( $data['otp_token'] ) );

			if ( SessionUtils::is_status_match( $this->form_session_var, self::VALIDATED, sanitize_text_field( $data['otpType'] ) ) ) {
				wp_send_json(
					MoUtility::create_json(
						MoConstants::SUCCESS_JSON_TYPE,
						MoConstants::SUCCESS_JSON_TYPE
					)
				);
			} else {
				wp_send_json(
					MoUtility::create_json(
						MoMessages::showMessage( MoMessages::INVALID_OTP ),
						MoConstants::ERROR_JSON_TYPE
					)
				);
			}
		}

		/**
		 * Check Integrity of the email or phone number. i.e. Ensure that the Email or
		 * Phone that the OTP was sent to is the same Email or Phone that is being submitted
		 * with the form.
		 * Once integrity check passes validate the OTP to ensure that the user has entered
		 * the correct OTP.
		 *
		 * @param array $data - this is the get / post data from the ajax call containing email or phone.
		 */
		private function check_integrity( $data ) {
			if ( 'phone' === $data['otpType'] ) {
				$phone = MoUtility::process_phone_number( sanitize_text_field( $data['user_phone'] ) );
				if ( ! SessionUtils::is_phone_verified_match( $this->form_session_var, $phone ) ) {
					wp_send_json(
						MoUtility::create_json(
							MoMessages::showMessage( MoMessages::PHONE_MISMATCH ),
							MoConstants::ERROR_JSON_TYPE
						)
					);
				}
			} elseif ( ! SessionUtils::is_email_verified_match( $this->form_session_var, sanitize_email( wp_unslash( $data['user_email'] ) ) ) ) {
				wp_send_json(
					MoUtility::create_json(
						MoMessages::showMessage( MoMessages::EMAIL_MISMATCH ),
						MoConstants::ERROR_JSON_TYPE
					)
				);
			}
		}

		/**
		 * This function is used to enqueue script on the frontend to facilitate
		 * OTP Verification for the Forminator form. This function
		 * also localizes certain values required by the script.
		 */
		public function miniorange_register_forminator_script() {
			wp_register_script( 'moforminator', MOV_URL . 'includes/js/moforminator.js', array( 'jquery' ), MOV_VERSION, false );
			wp_localize_script(
				'moforminator',
				'moforminator',
				array(
					'siteURL'     => admin_url( 'admin-ajax.php' ),
					'otpType'     => $this->ajax_processing_fields(),
					'gnonce'      => wp_create_nonce( $this->nonce ),
					'nonceKey'    => wp_create_nonce( $this->nonce_key ),
					'vnonce'      => wp_create_nonce( $this->nonce ),
					'buttontext'  => $this->button_text,
					'imgURL'      => MOV_LOADER_URL,
					'formDetails' => $this->form_details,
					'fieldText'   => __( 'Enter OTP here', 'miniorange-otp-verification' ),
					'validated'   => $this->get_session_details(),
					'gaction'     => $this->generate_otp_action,
					'vaction'     => $this->validate_otp_action,
				)
			);
			wp_enqueue_script( 'moforminator' );
		}

		/**
		 * Checks if OTP is validated.
		 *
		 * @return array
		 */
		private function get_session_details() {
			return array(
				VerificationType::EMAIL => SessionUtils::is_status_match( $this->form_session_var, self::VALIDATED, VerificationType::EMAIL ),
				VerificationType::PHONE => SessionUtils::is_status_match( $this->form_session_var, self::VALIDATED, VerificationType::PHONE ),
			);
		}

		/**
		 * This function is called to send the OTP token to the user.
		 *
		 * @return void
		 */
		public function mo_send_otp() {
			// Security: Use hardcoded nonce action 'form_nonce' and key 'security' instead of variables.
			if ( ! check_ajax_referer( 'form_nonce', 'security', false ) ) {
				wp_send_json(
					MoUtility::create_json(
						MoMessages::showMessage( MoMessages::UNKNOWN_ERROR ),
						MoConstants::ERROR_JSON_TYPE
					)
				);
			}
			$data = MoUtility::mo_sanitize_array( wp_unslash( $_POST ) );

			if ( $this->otp_type === $this->type_phone_tag ) {
				$this->mo_process_phone_and_start_otp_verification_process( $data );
			} else {
				$this->mo_process_email_and_start_otp_verification_process( $data );
			}
		}

		/**
		 * The function is used to check if user has provided an email
		 * address in the form to initiate email verification.
		 *
		 * @param array $data - this is the get / post data from the ajax call containing email or phone.
		 */
		private function mo_process_email_and_start_otp_verification_process( $data ) {
			if ( ! MoUtility::sanitize_check( 'user_email', $data ) ) {
				wp_send_json( MoUtility::create_json( MoMessages::showMessage( MoMessages::ENTER_EMAIL ), MoConstants::ERROR_JSON_TYPE ) );
			} else {
				MoUtility::initialize_transaction( $this->form_session_var );
				$this->set_session_and_start_otp_verification( $data['user_email'], $data['user_email'], null, VerificationType::EMAIL );
			}
		}

		/**
		 * The function is used to check if user has provided an phone number
		 * address in the form to initiate SMS verification.
		 *
		 * @param array $data - this is the get / post data from the ajax call containing email or phone.
		 */
		private function mo_process_phone_and_start_otp_verification_process( $data ) {
			if ( ! MoUtility::sanitize_check( 'user_phone', $data ) ) {
				wp_send_json( MoUtility::create_json( MoMessages::showMessage( MoMessages::ENTER_PHONE ), MoConstants::ERROR_JSON_TYPE ) );
			} else {
				MoUtility::initialize_transaction( $this->form_session_var );
				$phone = MoUtility::process_phone_number( $data['user_phone'] );
				$this->set_session_and_start_otp_verification( $phone, null, $phone, VerificationType::PHONE );
			}
		}

		/**
		 * This function is used to set session variables and start the
		 * OTP Verification process.
		 *
		 * @param string $session_value - the session value which is usually the email or phone number.
		 * @param string $user_email    - the email provided by the user.
		 * @param string $phone_number - the phone number provided by the user.
		 * @param string $otp_type - the otp type denoting the type of otp verification. Can be phone or email.
		 */
		private function set_session_and_start_otp_verification( $session_value, $user_email, $phone_number, $otp_type ) {
			SessionUtils::add_email_or_phone_verified( $this->form_session_var, $session_value, $otp_type );
			$this->send_challenge( '', $user_email, null, $phone_number, $otp_type );
		}


		/**
		 * This function is called to validate the OTP entered by the user. This is
		 * an ajax call and needs to send a json response indicating if the validation was
		 * successful or not.
		 *
		 * @param array $entry - the data coming in the ajax call. Mostly has the otp entered.
		 */
		private function process_otp_entered( $entry ) {
			$otp_ver_type = $this->get_verification_type();
			$this->validate_challenge( $otp_ver_type, null, $entry );
			if ( ! SessionUtils::is_status_match( $this->form_session_var, self::VALIDATED, $otp_ver_type ) ) {
				$entry = new WP_Error( 'INVALID_OTP', MoUtility::get_invalid_otp_method() );
			}
			return $entry;
		}


		/**
		 * This function hooks into the ninja_forms_submit_data hook and checks if
		 * OTP verification has been started by checking if the session variable
		 * has been set in session.
		 *
		 * @param array $entry - this is the ninja form variable containing the form data.
		 * @return array
		 */
		private function check_if_otp_verification_started( $entry ) {
			return SessionUtils::is_otp_initialized( $this->form_session_var ) ? $entry
			: new WP_Error( 'ENTER_VERIFY_CODE', MoMessages::showMessage( MoMessages::ENTER_VERIFY_CODE ) );
		}


		/** Fetch the Email address entered by the user and start the otp verification process
		 *
		 * @param array $entry the data posted by the user.
		 */
		private function process_email( $entry ) {
			return SessionUtils::is_email_verified_match( $this->form_session_var, $entry ) ? $entry :
			new WP_Error( 'EMAIL_MISMATCH', MoMessages::showMessage( MoMessages::EMAIL_MISMATCH ) );
		}


		/** Fetch the phone number entered by the user and check if valid
		 *
		 * @param string $entry - gives the phone number entered by the user.
		 */
		private function process_phone( $entry ) {
			$phone = MoUtility::process_phone_number( $entry );
			return SessionUtils::is_phone_verified_match( $this->form_session_var, $phone ) ? $entry :
			new WP_Error( 'PHONE_MISMATCH', MoMessages::showMessage( MoMessages::PHONE_MISMATCH ) );
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

			SessionUtils::add_status( $this->form_session_var, self::VERIFICATION_FAILED, $otp_type );
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
			SessionUtils::add_status( $this->form_session_var, self::VALIDATED, $otp_type );
		}


		/**
		 * Unset all session variables used
		 */
		public function unset_otp_session_variables() {
			SessionUtils::unset_session( array( $this->tx_session_id, $this->form_session_var ) );
		}

		/**
		 * This function is called by the filter mo_phone_dropdown_selector
		 * to return the Jquery selector of the phone field. The function will
		 * push the formID to the selector array if OTP Verification for the
		 * form has been enabled.
		 *
		 * @param string $selector - the Jquery selector to be modified.
		 * @return array
		 */
		public function get_phone_number_selector( $selector ) {
			if ( $this->is_form_enabled && $this->otp_type === $this->type_phone_tag ) {
				$selector = array_merge( $selector, $this->phone_form_id );
			}
			return $selector;
		}


		/**
		 * Handles saving all the frm Form related options by the admin.
		 */
		public function handle_form_options() {

			if ( ! MoUtility::are_form_options_being_saved( $this->get_form_option(), 'forminator_enable' ) ) {
				return;
			}
			$forminator_form_data = $this->sanitize_form_post( 'forminator_form', '' );
			if ( false === $forminator_form_data || ! is_array( $forminator_form_data ) ) {
				return;
			}
			$data                  = array( 'forminator_form' => $forminator_form_data );
			$this->is_form_enabled = $this->sanitize_form_post( 'forminator_enable' );
			$this->otp_type        = $this->sanitize_form_post( 'forminator_enable_type' );
			$this->button_text     = $this->sanitize_form_post( 'forminator_button_text' );

			$form = $this->parse_form_details( $data );

			$this->form_details = ! empty( $form ) ? $form : '';

			update_mo_option( 'forminator_enable', $this->is_form_enabled );
			update_mo_option( 'forminator_enable_type', $this->otp_type );
			update_mo_option( 'forminator_button_text', $this->button_text );
			update_mo_option( 'forminator_forms', maybe_serialize( $this->form_details ) );
		}

		/**
		 * To parse the form details from settings page
		 *
		 * @param array $data the data posted while savig the form.
		 *
		 * @return array
		 */
		private function parse_form_details( $data ) {

			$form  = array();
			$forms = isset( $data['forminator_form']['form'] ) ? $data['forminator_form']['form'] : array();
			foreach ( array_filter( $forms ) as $key => $value ) {
				$emailkey       = isset( $data['forminator_form']['emailkey'][ $key ] ) ? ( $data['forminator_form']['emailkey'][ $key ] ) : '';
				$phonekey       = isset( $data['forminator_form']['phonekey'][ $key ] ) ? ( $data['forminator_form']['phonekey'][ $key ] ) : '';
				$form[ $value ] = array(
					'emailkey'   => $emailkey,
					'phonekey'   => $phonekey,
					'phone_show' => $phonekey,
					'email_show' => $emailkey,
				);
			}
			return $form;
		}
	}
}
