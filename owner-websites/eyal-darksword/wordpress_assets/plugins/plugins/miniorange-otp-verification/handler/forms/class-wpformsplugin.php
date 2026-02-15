<?php
/**
 * Load admin view for WPForms.
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

/**
 * This is the WPForms class. This class handles all the
 * functionality related to WPForms. It extends the FormHandler
 * and implements the IFormHandler class to implement some much needed functions.
 */
if ( ! class_exists( 'WPFormsPlugin' ) ) {
	/**
	 * WPFormsPlugin class
	 */
	class WPFormsPlugin extends FormHandler implements IFormHandler {

		use Instance;

		/**
		 * Initializes values
		 */
		protected function __construct() {
			$this->is_login_or_social_form = false;
			$this->is_ajax_form            = true;
			$this->form_session_var        = FormSessionVars::WPFORM;
			$this->phone_form_id           = array();
			$this->form_key                = 'WPFORMS';
			$this->type_phone_tag          = 'mo_wpform_phone_enable';
			$this->type_email_tag          = 'mo_wpform_email_enable';
			$this->type_both_tag           = 'mo_wpform_both_enable';
			$this->form_name               = 'WPForms';
			$this->is_form_enabled         = get_mo_option( 'wpform_enable' );
			$this->button_text             = get_mo_option( 'wpforms_sendotp_button_text' );
			$this->button_text             = ! MoUtility::is_blank( $this->button_text ) ? $this->button_text : '';
			$this->verify_button_text      = get_mo_option( 'wpforms_verify_button_text' );
			$this->verify_button_text      = ! MoUtility::is_blank( $this->verify_button_text ) ? $this->verify_button_text : '';
			$this->enter_otp_text          = get_mo_option( 'wpforms_enterotp_field_text' );
			$this->enter_otp_text          = ! MoUtility::is_blank( $this->enter_otp_text ) ? $this->enter_otp_text : '';
			$this->generate_otp_action     = 'miniorange-wpform-send-otp';
			$this->validate_otp_action     = 'miniorange-wpform-verify-code';
			$this->form_documents          = MoFormDocs::WP_FORMS_LINK;
			parent::__construct();
		}

		/**
		 * Function checks if form has been enabled by the admin and initializes
		 * all the class variables. This function also defines all the hooks to
		 * hook into to make OTP Verification possible.
		 */
		public function handle_form() {
			$this->otp_type     = get_mo_option( 'wpform_enable_type' );
			$this->form_details = maybe_unserialize( get_mo_option( 'wpform_forms' ) );
			if ( empty( $this->form_details ) ) {
				return;
			}
			if ( $this->otp_type === $this->type_phone_tag || $this->otp_type === $this->type_both_tag ) {
				foreach ( $this->form_details as $key => $value ) {
					array_push( $this->phone_form_id, '#wpforms-' . $key . '-field_' . $value['phonekey'] );
				}
			}

			add_filter( 'wpforms_process_initial_errors', array( $this, 'validate_form' ), 1, 2 );
			add_action( 'wp_enqueue_scripts', array( $this, 'mo_enqueue_wpforms' ) );

			add_action( "wp_ajax_{$this->generate_otp_action}", array( $this, 'send_otp' ) );
			add_action( "wp_ajax_nopriv_{$this->generate_otp_action}", array( $this, 'send_otp' ) );
			add_action( "wp_ajax_{$this->validate_otp_action}", array( $this, 'process_form_and_validate_otp' ) );
			add_action( "wp_ajax_nopriv_{$this->validate_otp_action}", array( $this, 'process_form_and_validate_otp' ) );
		}

		/**
		 * Function to register script and localize variables and add the script to the frontend
		 */
		public function mo_enqueue_wpforms() {
			wp_register_script( 'mowpforms', MOV_URL . 'includes/js/mowpforms.js', array( 'jquery' ), MOV_VERSION, true );
			wp_localize_script(
				'mowpforms',
				'mowpforms',
				array(
					'siteURL'          => wp_ajax_url(),
					'otpType'          => $this->ajax_processing_fields(),
					'formDetails'      => $this->form_details,
					'buttontext'       => $this->button_text,
					'validated'        => $this->get_session_details(),
					'imgURL'           => MOV_LOADER_URL,
					'fieldText'        => $this->enter_otp_text,
					'verifyButtonText' => $this->verify_button_text,
					'gnonce'           => wp_create_nonce( $this->nonce ),
					'nonceKey'         => wp_create_nonce( $this->nonce_key ),
					'vnonce'           => wp_create_nonce( $this->nonce ),
					'formNonce'        => wp_create_nonce( 'mo_wpforms_form_submition_nonce' ),
					'gaction'          => $this->generate_otp_action,
					'vaction'          => $this->validate_otp_action,
				)
			);
			wp_enqueue_script( 'mowpforms' );
		}

		/**
		 * Get session details.
		 */
		private function get_session_details() {
			return array(
				VerificationType::EMAIL => SessionUtils::is_status_match( $this->form_session_var, self::VALIDATED, VerificationType::EMAIL ),
				VerificationType::PHONE => SessionUtils::is_status_match( $this->form_session_var, self::VALIDATED, VerificationType::PHONE ),
			);
		}

		/**
		 * The function is used to process the email or phone number provided
		 * and send OTP to it for verification. This is called from the form
		 * using AJAX calls.
		 */
		public function send_otp() {

			// Security: Use hardcoded nonce key 'security' instead of variable to prevent manipulation.
			if ( ! isset( $_POST['security'] ) || ! wp_verify_nonce( sanitize_text_field( wp_unslash( $_POST['security'] ) ), 'form_nonce' ) ) {
				wp_send_json(
					MoUtility::create_json(
						MoMessages::showMessage( MoMessages::INVALID_OP ),
						MoConstants::ERROR_JSON_TYPE
					)
				);
			}
			$post_data = MoUtility::mo_sanitize_array( $_POST );
			MoUtility::initialize_transaction( $this->form_session_var );

			if ( isset( $post_data['otpType'] ) && 'mo_wpform_' . $post_data['otpType'] . '_enable' === $this->type_phone_tag ) {
				$this->process_phone_and_send_otp( $post_data );
			} else {
				$this->process_email_and_send_otp( $post_data );
			}
		}

		/**
		 * The function is used to check if user has provided an email
		 * address in the form to initiate email verification.
		 *
		 * @param array $data - this is the get / post data from the ajax call containing email or phone.
		 */
		private function process_email_and_send_otp( $data ) {
			if ( ! MoUtility::sanitize_check( 'user_email', $data ) ) {
				wp_send_json(
					MoUtility::create_json(
						MoMessages::showMessage( MoMessages::ENTER_EMAIL ),
						MoConstants::ERROR_JSON_TYPE
					)
				);
			} else {
				$user_email = sanitize_email( $data['user_email'] );
				SessionUtils::add_email_verified( $this->form_session_var, $user_email );
				$this->send_challenge( '', $user_email, null, null, VerificationType::EMAIL );
			}
		}


		/**
		 * The function is used to check if user has provided an phone number
		 * address in the form to initiate SMS verification.
		 *
		 * @param array $data - this is the get / post data from the ajax call containing email or phone.
		 */
		private function process_phone_and_send_otp( $data ) {
			if ( ! MoUtility::sanitize_check( 'user_phone', $data ) ) {
				wp_send_json(
					MoUtility::create_json(
						MoMessages::showMessage( MoMessages::ENTER_PHONE ),
						MoConstants::ERROR_JSON_TYPE
					)
				);
			} else {
				$user_phone = MoUtility::process_phone_number( sanitize_text_field( $data['user_phone'] ) );
				SessionUtils::add_phone_verified( $this->form_session_var, $user_phone );
				$this->send_challenge( '', null, null, $user_phone, VerificationType::PHONE );
			}
		}

		/**
		 * Process form and Validate OTP.
		 */
		public function process_form_and_validate_otp() {
			// Security: Use hardcoded nonce key 'security' and action 'form_nonce' instead of variables.
			if ( ! isset( $_POST['security'] ) || ! wp_verify_nonce( sanitize_text_field( wp_unslash( $_POST['security'] ) ), 'form_nonce' ) ) {
				wp_send_json(
					MoUtility::create_json(
						MoMessages::showMessage( MoMessages::INVALID_OP ),
						MoConstants::ERROR_JSON_TYPE
					)
				);
			}
			$post_data = MoUtility::mo_sanitize_array( $_POST );
			$this->check_if_otp_sent();
			$this->check_integrity_and_validate_otp( $post_data );
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
		 * Check Integrity and validate OTP.
		 *
		 * @param array $data - this is the get / post data from the ajax call containing email or phone.
		 */
		private function check_integrity_and_validate_otp( $data ) {

			$this->check_integrity( $data );
			$this->validate_challenge( $data['otpType'], null, $data['otp_token'] );

			if ( SessionUtils::is_status_match( $this->form_session_var, self::VALIDATED, $data['otpType'] ) ) {
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
		 * Checks Integrity.
		 *
		 * @param array $data - this is the get / post data from the ajax call containing email or phone.
		 */
		private function check_integrity( $data ) {
			if ( 'phone' === $data['otpType'] ) {
				$phone = MoUtility::process_phone_number( $data['user_phone'] );
				if ( ! SessionUtils::is_phone_verified_match( $this->form_session_var, $phone ) ) {
					wp_send_json(
						MoUtility::create_json(
							MoMessages::showMessage( MoMessages::PHONE_MISMATCH ),
							MoConstants::ERROR_JSON_TYPE
						)
					);
				}
			} elseif ( ! SessionUtils::is_email_verified_match( $this->form_session_var, $data['user_email'] ) ) {
				wp_send_json(
					MoUtility::create_json(
						MoMessages::showMessage( MoMessages::EMAIL_MISMATCH ),
						MoConstants::ERROR_JSON_TYPE
					)
				);
			}
		}

		/**
		 * This function hooks into the wpforms_process_initial_errors hook to
		 * validate the form being submitted. This function checks if the email
		 * and phone number values are consistent and if the OTP entered by the
		 * user is valid.
		 *
		 * @param object $errors - WpForm error object.
		 * @param array  $form_data - form data passed by wpform.
		 * @return array $errors
		 */
		public function validate_form( $errors, $form_data ) {
			if ( ! isset( $_POST['mo_wpforms_nonce'] ) || ! wp_verify_nonce( sanitize_key( wp_unslash( $_POST['mo_wpforms_nonce'] ) ), 'mo_wpforms_form_submition_nonce' ) ) {
				return $errors;
			}
			$post_data = MoUtility::mo_sanitize_array( $_POST );

			$id = $form_data['id'];
			if ( ! array_key_exists( $id, $this->form_details ) ) {
				return $errors;
			}
			$form_data = $this->form_details[ $id ];
			if ( ! empty( $errors ) ) {
				return $errors;
			}
			if ( ! SessionUtils::is_otp_initialized( $this->form_session_var ) ) {
				$field_id                   = $this->otp_type === $this->type_email_tag ? $form_data['emailkey'] : $form_data['phonekey'];
				$errors[ $id ][ $field_id ] = MoMessages::showMessage( MoMessages::ENTER_VERIFY_CODE );
				return $errors;
			}
			if ( $this->otp_type === $this->type_email_tag || $this->otp_type === $this->type_both_tag ) {
				$errors = $this->process_email( $form_data, $errors, $id, $post_data );
			}
			if ( $this->otp_type === $this->type_phone_tag || $this->otp_type === $this->type_both_tag ) {
				$errors = $this->process_phone( $form_data, $errors, $id, $post_data );
			}
			if ( empty( $errors ) ) {
				$this->unset_otp_session_variables();
			}
			return $errors;
		}

		/**
		 * The function is used to process email to send the OTP to
		 * and return the data associated with the form
		 *
		 * @param array  $form_data - the formData saved by the plugin for that form.
		 * @param object $errors - the error object given by wpForms.
		 * @param int    $id - the ID of the form in question.
		 * @param array  $post_data - $_POST.
		 * @return array
		 */
		private function process_email( $form_data, $errors, $id, $post_data ) {
			$field_id = $form_data['emailkey'];
			if ( ! SessionUtils::is_status_match( $this->form_session_var, self::VALIDATED, VerificationType::EMAIL ) ) {
				$errors[ $id ][ $field_id ] = MoMessages::showMessage( MoMessages::ENTER_VERIFY_CODE );
			}
			if ( ! SessionUtils::is_email_verified_match( $this->form_session_var, $post_data['wpforms']['fields'][ $field_id ] ) ) {
				$errors[ $id ][ $field_id ] = MoMessages::showMessage( MoMessages::EMAIL_MISMATCH );
			}
			return $errors;
		}


		/**
		 * The function is used to process the phone number to send the OTP to
		 * and return the data associated with the form
		 *
		 * @param array  $form_data - the formData saved by the plugin for that form.
		 * @param array  $errors - the error object given by wpForms.
		 * @param string $id - the ID of the form in question.
		 * @param array  $post_data - $_POST.
		 * @return array
		 */
		private function process_phone( $form_data, $errors, $id, $post_data ) {
			$field_id = $form_data['phonekey'];
			if ( ! SessionUtils::is_status_match( $this->form_session_var, self::VALIDATED, VerificationType::PHONE ) ) {
				$errors[ $id ][ $field_id ] = MoMessages::showMessage( MoMessages::ENTER_VERIFY_CODE );
			}
			$phone_input = MoUtility::process_phone_number( $post_data['wpforms']['fields'][ $field_id ] );
			if ( ! SessionUtils::is_phone_verified_match( $this->form_session_var, $phone_input ) ) {
				$errors[ $id ][ $field_id ] = MoMessages::showMessage( MoMessages::PHONE_MISMATCH );
			}
			return $errors;
		}


		/**
		 * This function hooks into the otp_verification_failed hook. This function
		 * details what is done if the OTP verification fails.
		 *
		 * @param string           $user_login - the username posted by the user.
		 * @param string           $user_email - the email posted by the user.
		 * @param string           $phone_number - the phone number posted by the user.
		 * @param VerificationType $otp_type The Verification Type.
		 */
		public function handle_failed_verification( $user_login, $user_email, $phone_number, $otp_type ) {

			SessionUtils::add_status( $this->form_session_var, self::VERIFICATION_FAILED, $otp_type );
		}


		/**
		 * This function hooks into the otp_verification_successful hook. This function is
		 * details what needs to be done if OTP Verification is successful.
		 *
		 * @param string           $redirect_to - the redirect to URL after new user registration.
		 * @param bool             $user_login - the username posted by the user.
		 * @param string           $user_email - the email posted by the user.
		 * @param string           $password - the password posted by the user.
		 * @param string           $phone_number - the phone number posted by the user.
		 * @param array            $extra_data - any extra data posted by the user.
		 * @param VerificationType $otp_type The Verification Type.
		 */
		public function handle_post_verification( $redirect_to, $user_login, $user_email, $password, $phone_number, $extra_data, $otp_type ) {

			SessionUtils::add_status( $this->form_session_var, self::VALIDATED, $otp_type );
		}


		/**
		 * Unset all the session variables so that a new form submission starts
		 * a fresh process of OTP verification.
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
		 * @param array $selector - the Jquery selector to be modified.
		 * @return array
		 */
		public function get_phone_number_selector( $selector ) {

			if ( $this->is_form_enabled
			&& ( $this->otp_type === $this->type_phone_tag || $this->otp_type === $this->type_both_tag ) ) {
				$selector = array_merge( $selector, $this->phone_form_id );
			}
			return $selector;
		}


		/**
		 * Handles saving all the WPForm related options by the admin.
		 */
		public function handle_form_options() {
			if ( ! MoUtility::are_form_options_being_saved( $this->get_form_option(), 'wpform_enable' ) ) {
				return;
			}
			$form_raw = $this->sanitize_form_post( 'wpform_form', '' );
			if ( empty( $form_raw ) ) {
				return;
			}
			$data = array( 'wpform_form' => $form_raw );
			$form = $this->parse_form_details( $data );

			$valid_forms      = array();
			$invalid_form_ids = array();

			foreach ( $form as $form_id => $form_config ) {
				if ( isset( $form_config['error'] ) || ( empty( $form_config['email_show'] ) && empty( $form_config['phone_show'] ) ) ) {
					$invalid_form_ids[] = $form_id;
				} else {
					$valid_forms[ $form_id ] = $form_config;
				}
			}
			if ( empty( $valid_forms ) && isset( $data['mo_customer_validation_wpform_enable'] ) ) {
				$message = MoMessages::showMessage( MoMessages::INVALID_FORM_DETAILS );
				do_action( 'mo_registration_show_message', $message, MoConstants::ERROR );
				return;
			}
			if ( ! empty( $invalid_form_ids ) ) {
				$ids_str = implode( ', ', $invalid_form_ids );
				$message = MoMessages::showMessage( MoMessages::INVALID_PHONE_EMAIL_LABEL, array( 'form_ids' => $ids_str ) );
				do_action( 'mo_registration_show_message', $message, MoConstants::ERROR );
			}

			$this->is_form_enabled    = $this->sanitize_form_post( 'wpform_enable' );
			$this->otp_type           = $this->sanitize_form_post( 'wpform_enable_type' );
			$this->button_text        = $this->sanitize_form_post( 'wpforms_sendotp_button_text' );
			$this->verify_button_text = $this->sanitize_form_post( 'wpforms_verify_button_text' );
			$this->enter_otp_text     = $this->sanitize_form_post( 'wpforms_enterotp_field_text' );
			$this->form_details       = $valid_forms;

			update_mo_option( 'wpform_enable', $this->is_form_enabled );
			update_mo_option( 'wpform_enable_type', $this->otp_type );
			update_mo_option( 'wpforms_sendotp_button_text', $this->button_text );
			update_mo_option( 'wpforms_verify_button_text', $this->verify_button_text );
			update_mo_option( 'wpforms_enterotp_field_text', $this->enter_otp_text );
			update_mo_option( 'wpform_forms', maybe_serialize( $this->form_details ) );
		}

		/**
		 * Parse Form Details
		 *
		 * @param array $data - contains the data from the $_POST.
		 */
		private function parse_form_details( $data ) {
			$form = array();
			if ( ! array_key_exists( 'wpform_form', $data ) ) {
				return $form;
			}
			foreach ( array_filter( ( $data['wpform_form']['form'] ) ) as $key => $value ) {
				$form_data = $this->get_form_data_from_id( $value );
				if ( MoUtility::is_blank( $form_data ) ) {
					$form[ $value ] = array(
						'error' => __( 'Invalid or missing form data.', 'miniorange-otp-verification' ),
					);
					continue;
				}
				$field_ids      = $this->get_field_ids( $data, $key, $form_data );
				$form[ $value ] = array(
					'emailkey'   => $field_ids['emailKey'],
					'phonekey'   => $field_ids['phoneKey'],
					'phone_show' => $data['wpform_form']['phonekey'][ $key ],
					'email_show' => $data['wpform_form']['emailkey'][ $key ],
				);
			}
			return $form;
		}

		/**
		 * Fetches the all of the data related to the WPform
		 * based on the ID passed to the function. This is
		 * done to fetch the field data related to the form.
		 *
		 * @param string $id FormID.
		 * @return string | array
		 */
		private function get_form_data_from_id( $id ) {
			$form = MoUtility::is_blank( $id ) ? null : get_post( absint( $id ) );
			if ( ! is_null( $form ) && isset( $form->post_content ) ) {
				return wp_unslash( json_decode( $form->post_content ) );
			}
			return '';
		}


		/**
		 * Fetches the EmailField Id from the formData based on the
		 * name provided by the user.
		 *
		 * @param array  $data - the phone of email to which otp needs to be sent to.
		 * @param string $key - meta_key to search for.
		 * @param object $form_data - form data passed by wpform.
		 * @return array
		 */
		private function get_field_ids( $data, $key, $form_data ) {
			$field_ids = array(
				'emailKey' => '',
				'phoneKey' => '',
			);
			if ( empty( $data ) ) {
				return $field_ids;
			}
			if ( isset( $form_data->fields ) && ( is_object( $form_data->fields ) ) ) {
				foreach ( $form_data->fields as $field ) {
					if ( ! property_exists( $field, 'label' ) ) {
						continue;
					}
					if ( strcasecmp( $field->label, $data['wpform_form']['emailkey'][ $key ] ) === 0 ) {
						$field_ids['emailKey'] = $field->id;
					}
					if ( strcasecmp( $field->label, $data['wpform_form']['phonekey'][ $key ] ) === 0 ) {
						$field_ids['phoneKey'] = $field->id;
					}
				}
			}
			return $field_ids;
		}
	}
}
