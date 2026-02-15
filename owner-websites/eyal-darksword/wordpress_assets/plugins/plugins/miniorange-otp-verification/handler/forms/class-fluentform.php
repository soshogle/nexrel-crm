<?php
/**
 * Handles the OTP verification logic for Fluent form.
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
 * This is the fluentforms class. This class handles all the
 * functionality related to fluentforms. It extends the FormHandler
 * and implements the IFormHandler class to implement some much needed functions.
 */
if ( ! class_exists( 'FluentForm' ) ) {
	/**
	 * Fluentforms class
	 */
	class FluentForm extends FormHandler implements IFormHandler {

		use Instance;

		/**
		 * Initializes values
		 */
		protected function __construct() {
			$this->is_login_or_social_form = false;
			$this->is_ajax_form            = true;
			$this->form_session_var        = FormSessionVars::FLUENTFORM;
			$this->phone_form_id           = array();
			$this->form_key                = 'FLUENTFORM';
			$this->type_phone_tag          = 'mo_fluentform_phone_enable';
			$this->type_email_tag          = 'mo_fluentform_email_enable';
			$this->type_both_tag           = 'mo_fluentform_both_enable';
			$this->form_name               = 'Fluent Form';
			$this->is_form_enabled         = get_mo_option( 'fluentform_enable' );
			$this->generate_otp_action     = 'miniorange-fluentform-send-otp';
			$this->validate_otp_action     = 'miniorange-fluentform-verify-code';
			$this->form_documents          = MoFormDocs::FLUENT_FORM_LINK;
			parent::__construct();
		}
		/**
		 * Function checks if form has been enabled by the admin and initializes
		 * all the class variables. This function also defines all the hooks to
		 * hook into to make OTP Verification possible.
		 */
		public function handle_form() {
			$this->otp_type     = get_mo_option( 'fluentform_enable_type' );
			$this->form_details = maybe_unserialize( get_mo_option( 'fluentform_forms' ) );

			if ( $this->otp_type === $this->type_phone_tag && $this->form_details ) {
				foreach ( $this->form_details as $key => $value ) {
					array_push( $this->phone_form_id, '#ff_' . $key . '_' . $value['phonekey'] );
				}
			}
			add_action( 'fluentform_before_insert_submission', array( $this, 'check_form_submit' ), 10, 3 );
			add_action( 'wp_enqueue_scripts', array( $this, 'mo_fluent_form_script' ) );
			add_action( "wp_ajax_{$this->generate_otp_action}", array( $this, 'send_otp' ) );
			add_action( "wp_ajax_nopriv_{$this->generate_otp_action}", array( $this, 'send_otp' ) );
		}
		/**
		 * Function to register script and localize variables and add the script to the frontend
		 */
		public function mo_fluent_form_script() {
			wp_register_script( 'mofluent', MOV_URL . 'includes/js/mofluentform.js', array( 'jquery' ), MOV_VERSION, true );
			wp_localize_script(
				'mofluent',
				'mofluent',
				array(
					'siteURL'     => admin_url( 'admin-ajax.php' ),
					'formdetails' => $this->form_details,
					'otpType'     => $this->otp_type,
					'formkey'     => strcasecmp( $this->otp_type, $this->type_phone_tag ) === 0 ? 'phonekey' : 'emailkey',
					'gnonce'      => wp_create_nonce( $this->nonce ),
					'nonceKey'    => wp_create_nonce( $this->nonce_key ),
					'gaction'     => $this->generate_otp_action,
					'imgURL'      => MOV_LOADER_URL,
				)
			);
			wp_enqueue_script( 'mofluent' );
		}
		/**
		 * Function for the form submission hook.
		 *
		 * @param array  $insert_data - data to be insert.
		 * @param array  $data - data.
		 * @param String $form - form values.
		 */
		public function check_form_submit( $insert_data, $data, $form ) {
			$form_id = null === $form['form_id'] ? $form['attributes']['id'] : $form['form_id'];
			if ( ! array_key_exists( $form_id, $this->form_details ) ) {
				return;
			}
			$this->check_if_otp_sent();
			$this->check_integrity( $insert_data, $data, $form );
			$this->validate_otp( $insert_data, $data, $form );
		}
		/**
		 * Validate OTP.
		 *
		 * @param array  $insert_data - data to be insert.
		 * @param array  $data - data.
		 * @param String $form - form values.
		 */
		public function validate_otp( $insert_data, $data, $form ) {
			$otp_ver_type = $this->get_verification_type();
			$this->validate_challenge( $otp_ver_type, null, sanitize_text_field( $data['enter_otp'] ) );
			if ( SessionUtils::is_status_match( $this->form_session_var, self::VALIDATED, $otp_ver_type ) ) {
				$this->unset_otp_session_variables();
			} else {
				wp_send_json_error(
					array(
						'message' => MoMessages::showMessage( MoMessages::INVALID_OTP ),
					),
					201
				);
			}
		}
		/**
		 * Checks whether OTP sent or not.
		 */
		private function check_if_otp_sent() {
			if ( ! SessionUtils::is_otp_initialized( $this->form_session_var ) ) {
				wp_send_json_error(
					array(
						'message' => MoMessages::showMessage( MoMessages::ENTER_VERIFY_CODE ),
					),
					201
				);
			}
		}
		/**
		 * Checks Integrity.
		 *
		 * @param array  $insert_data - data to be insert.
		 * @param array  $data - data.
		 * @param String $form - form values.
		 */
		private function check_integrity( $insert_data, $data, $form ) {
			$email_key = $this->form_details[ $insert_data['form_id'] ]['emailkey'];
			$phone_key = $this->form_details[ $insert_data['form_id'] ]['phonekey'];

			if ( $this->otp_type === $this->type_phone_tag ) {
				$phone = MoUtility::process_phone_number( $data[ $phone_key ] );
				if ( ! SessionUtils::is_phone_verified_match( $this->form_session_var, $phone ) ) {
					wp_send_json_error(
						array(
							'message' => MoMessages::showMessage( MoMessages::PHONE_MISMATCH ),
						),
						201
					);
				}
			} elseif ( ! SessionUtils::is_email_verified_match( $this->form_session_var, sanitize_email( $data[ $email_key ] ) ) ) {
				wp_send_json_error(
					array(
						'message' => MoMessages::showMessage( MoMessages::EMAIL_MISMATCH ),
					),
					201
				);
			}
		}
		/**
		 * The function is used to process the email or phone number provided
		 * and send OTP to it for verification. This is called from the form
		 * using AJAX calls.
		 */
		public function send_otp() {
			// Security: Use hardcoded nonce action 'form_nonce' and key 'security' instead of variables.
			if ( ! check_ajax_referer( 'form_nonce', 'security', false ) ) {
				wp_send_json_error(
					array(
						'message' => MoMessages::showMessage( MoMessages::INVALID_OTP ),
					),
					400
				);
			}
			$post_data = MoUtility::mo_sanitize_array( $_POST );
			MoUtility::initialize_transaction( $this->form_session_var );
			if ( $post_data['otpType'] === $this->type_phone_tag ) {
				$this->process_phone_and_send_otp( $post_data );
			} else {
				$this->process_email_and_send_otp( $post_data );
			}
		}

		/**
		 * The function is used to check if user has provided an phone number
		 * address in the form to initiate SMS verification.
		 *
		 * @param array $data - this is the get / post data from the ajax call containing email or phone.
		 */
		private function process_phone_and_send_otp( $data ) {
			if ( ! MoUtility::sanitize_check( 'user_value', $data ) ) {
				wp_send_json(
					MoUtility::create_json(
						MoMessages::showMessage( MoMessages::ENTER_PHONE ),
						MoConstants::ERROR_JSON_TYPE
					)
				);
			} else {
				$user_value = $data['user_value'];
				$user_value = MoUtility::process_phone_number( $user_value );
				SessionUtils::add_phone_verified( $this->form_session_var, $user_value );
				$this->send_challenge( '', null, null, $user_value, VerificationType::PHONE );
			}
		}
		/**
		 * The function is used to check if user has provided an email
		 * address in the form to initiate email verification.
		 *
		 * @param array $data - this is the get / post data from the ajax call containing email or phone.
		 */
		private function process_email_and_send_otp( $data ) {
			if ( ! MoUtility::sanitize_check( 'user_value', $data ) ) {
				wp_send_json(
					MoUtility::create_json(
						MoMessages::showMessage( MoMessages::ENTER_EMAIL ),
						MoConstants::ERROR_JSON_TYPE
					)
				);
			} else {
				$raw_email = isset( $data['user_value'] ) ? (string) $data['user_value'] : '';
				$email     = sanitize_email( wp_unslash( $raw_email ) );
				if ( empty( $email ) || ! is_email( $email ) ) {
					$display_email = sanitize_text_field( $raw_email );
					$message       = str_replace( '##email##', esc_html( $display_email ), MoMessages::showMessage( MoMessages::ERROR_EMAIL_FORMAT ) );
					wp_send_json(
						MoUtility::create_json( $message, MoConstants::ERROR_JSON_TYPE )
					);
				} else {
					SessionUtils::add_email_verified( $this->form_session_var, $email );
					$this->send_challenge( '', $email, null, null, VerificationType::EMAIL );
				}
			}
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
		 * Handles saving all the fluentform related options by the admin.
		 */
		public function handle_form_options() {
			if ( ! MoUtility::are_form_options_being_saved( $this->get_form_option(), 'fluentform_enable' ) ) {
				return;
			}
			$form_raw = $this->sanitize_form_post( 'fluentform_form', '' );
			if ( empty( $form_raw ) ) {
				return;
			}
			$data = array( 'fluentform_form' => $form_raw );
			$form = $this->parse_form_details( $data );

			$this->is_form_enabled = $this->sanitize_form_post( 'fluentform_enable' );
			$this->otp_type        = $this->sanitize_form_post( 'fluentform_enable_type' );
			$this->form_details    = ! empty( $form ) ? $form : '';

			update_mo_option( 'fluentform_enable', $this->is_form_enabled );
			update_mo_option( 'fluentform_enable_type', $this->otp_type );
			update_mo_option( 'fluentform_forms', maybe_serialize( $this->form_details ) );
		}

		/**
		 * Parse Form Details
		 *
		 * @param array $data - contains the data from the $_POST.
		 */
		private function parse_form_details( $data ) {
			$form = array();
			if ( ! array_key_exists( 'fluentform_form', $data ) ) {
				return $form;
			}
			foreach ( array_filter( ( $data['fluentform_form']['form'] ) ) as $key => $value ) {

				$form[ absint( $value ) ] = array(
					'emailkey'   => $data['fluentform_form']['emailkey'][ $key ],
					'phonekey'   => $data['fluentform_form']['phonekey'][ $key ],
					'phone_show' => $data['fluentform_form']['phonekey'][ $key ],
					'email_show' => $data['fluentform_form']['emailkey'][ $key ],
				);
			}
			return $form;
		}
	}
}
