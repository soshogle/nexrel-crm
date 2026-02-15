<?php
/**
 * Handles the OTP verification logic for FormidableForm form.
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
use OTP\Objects\BaseMessages;
use OTP\Objects\FormHandler;
use OTP\Objects\IFormHandler;
use OTP\Objects\VerificationType;
use OTP\Traits\Instance;
use ReflectionException;

/**
 * This is the Formidable Form class. This class handles all the
 * functionality related to frm Form. It extends the FormHandler
 * and implements the IFormHandler class to implement some much needed functions.
 */
if ( ! class_exists( 'FormidableForm' ) ) {
	/**
	 * FormidableForm class
	 */
	class FormidableForm extends FormHandler implements IFormHandler {

		use Instance;

		/**
		 * Phone or email field Value
		 *
		 * @var string
		 */
		public $field_value;

		/**
		 * Initializes values
		 */
		protected function __construct() {
			$this->is_login_or_social_form = false;
			$this->is_ajax_form            = true;
			$this->form_session_var        = FormSessionVars::FORMIDABLE_FORM;
			$this->type_phone_tag          = 'mo_frm_form_phone_enable';
			$this->type_email_tag          = 'mo_frm_form_email_enable';
			$this->form_key                = 'FORMIDABLE_FORM';
			$this->form_name               = 'Formidable Forms';
			$this->is_form_enabled         = get_mo_option( 'frm_form_enable' );
			$this->button_text             = get_mo_option( 'frm_button_text' );
			$this->button_text             = ! MoUtility::is_blank( $this->button_text ) ? $this->button_text : '';
			$this->generate_otp_action     = 'miniorange_frm_generate_otp';
			$this->form_documents          = MoFormDocs::FORMIDABLE_FORM_LINK;
			parent::__construct();
		}
		/**
		 * Function checks if form has been enabled by the admin and initializes
		 * all the class variables. This function also defines all the hooks to
		 * hook into to make OTP Verification possible.
		 * */
		public function handle_form() {
			$this->otp_type      = get_mo_option( 'frm_form_enable_type' );
			$this->form_details  = maybe_unserialize( get_mo_option( 'frm_form_otp_enabled' ) );
			$this->phone_form_id = array();
			if ( empty( $this->form_details ) || ! $this->is_form_enabled ) {
				return;
			}
			foreach ( $this->form_details as $key => $value ) {
				array_push( $this->phone_form_id, '#' . $value['phonekey'] . ' input' );
			}
			add_filter( 'frm_validate_field_entry', array( $this, 'miniorange_otp_validation' ), 11, 4 );
			add_action( "wp_ajax_{$this->generate_otp_action}", array( $this, 'send_otp_frm_ajax' ) );
			add_action( "wp_ajax_nopriv_{$this->generate_otp_action}", array( $this, 'send_otp_frm_ajax' ) );
			add_action( 'wp_enqueue_scripts', array( $this, 'miniorange_register_formidable_script' ) );
		}
		/**
		 * This function registers the js file for enabling OTP Verification
		 * for Formidable Form using AJAX calls. Moving over to a script to make sure there are no
		 * javascript conflicts or jquery not defined errors.
		 */
		public function miniorange_register_formidable_script() {
			wp_register_script( 'moformidable', MOV_URL . 'includes/js/formidable.js', array( 'jquery' ), MOV_VERSION, true );
			wp_localize_script(
				'moformidable',
				'moformidable',
				array(
					'siteURL'     => admin_url( 'admin-ajax.php' ),
					'otpType'     => $this->otp_type,
					'formkey'     => strcasecmp( $this->otp_type, $this->type_phone_tag ) === 0 ? 'phonekey' : 'emailkey',
					'nonce'       => wp_create_nonce( $this->nonce ),
					'buttontext'  => $this->button_text,
					'imgURL'      => MOV_LOADER_URL,
					'forms'       => $this->form_details,
					'generateURL' => $this->generate_otp_action,
				)
			);
			wp_enqueue_script( 'moformidable' );
		}
		/**
		 * Ajax callback function to check nonce and start OTP Verification
		 * process by sending OTP to the appropriate destination
		 *
		 * @throws ReflectionException Add exception.
		 */
		public function send_otp_frm_ajax() {
			// Security: Use hardcoded nonce action 'form_nonce' instead of variable.
			if ( ! check_ajax_referer( 'form_nonce', 'security', false ) ) {
				wp_send_json( MoUtility::create_json( MoMessages::showMessage( MoMessages::UNKNOWN_ERROR ), MoConstants::ERROR_JSON_TYPE ) );
			}
			$data = MoUtility::mo_sanitize_array( $_POST );
			if ( $this->otp_type === $this->type_phone_tag ) {
				$this->send_frm_otp_to_phone( $data );
			} else {
				$this->send_frm_otp_to_email( $data );
			}
		}
		/**
		 * Makes call to start OTP verification for Phone Type.
		 *
		 * @param array $data array of data coming in post.
		 * @throws ReflectionException Adds exception.
		 */
		public function send_frm_otp_to_phone( $data ) {
			if ( ! MoUtility::sanitize_check( 'user_phone', $data ) ) {
				wp_send_json(
					MoUtility::create_json(
						MoMessages::showMessage( MoMessages::ENTER_PHONE ),
						MoConstants::ERROR_JSON_TYPE
					)
				);
			} else {
				$user_phone = MoUtility::process_phone_number( $data['user_phone'] );
				$this->mo_send_OTP( $user_phone, null, $user_phone, VerificationType::PHONE );
			}
		}
		/**
		 * Makes call to start OTP verification for Email Type.
		 *
		 * @param array $data the array of data coming in post.
		 * @throws ReflectionException Adds exception.
		 */
		private function send_frm_otp_to_email( $data ) {
			if ( ! MoUtility::sanitize_check( 'user_email', $data ) ) {
				wp_send_json(
					MoUtility::create_json(
						MoMessages::showMessage( MoMessages::ENTER_EMAIL ),
						MoConstants::ERROR_JSON_TYPE
					)
				);
			} else {
				$user_email = $data['user_email'];
				$this->mo_send_OTP( $user_email, $user_email, null, VerificationType::EMAIL );
			}
		}
		/**
		 * Sets the phone or email value to be authenticated in session and
		 * initiates the process for OTP Verification.
		 *
		 * @param string $session_value the email or phone for which the OTP has been sent.
		 * @param string $user_email user email entered to be verified.
		 * @param string $phone_number user phone number entered to be verified.
		 * @param string $otp_type OTP entered to verify.
		 * @throws ReflectionException Adds exception.
		 */
		private function mo_send_OTP( $session_value, $user_email, $phone_number, $otp_type ) {
			MoUtility::initialize_transaction( $this->form_session_var );
			if ( VerificationType::PHONE === $otp_type ) {
				SessionUtils::add_phone_verified( $this->form_session_var, $session_value );
			} else {
				SessionUtils::add_email_verified( $this->form_session_var, $session_value );
			}
			$this->send_challenge( '', $user_email, null, $phone_number, $otp_type );
		}
		/**
		 * Hooks to Formidable form hook to validate each field. For OTP field verifies the
		 * OTP token and the email or phone associated with it.
		 *
		 * @param array  $errors Contains an array of errors to return.
		 * @param mixed  $field  Current field information.
		 * @param string $value  field value.
		 * @param array  $args   an array of excluded value for repeating sections.
		 * @return array
		 */
		public function miniorange_otp_validation( $errors, $field, $value, $args ) {
			$form_id  = isset( $field->form_id ) ? absint( $field->form_id ) : 0;
			$field_id = $this->getFieldId( ( $this->is_phone_verification_enabled() ? 'phone_show' : 'email_show' ), $field );
			if ( $field->id === $field_id ) {
				$this->field_value = $value;
			}
			if ( 0 === $form_id || ! array_key_exists( $form_id, $this->form_details ) ) {
				return $errors;
			}
			if ( $this->getFieldId( 'verify_show', $field ) !== $field->id ) {
				return $errors;
			}
			if ( ! MoUtility::is_blank( $errors ) ) {
				return $errors;
			}
			if ( ! $this->has_otp_been_sent( $errors, $field ) ) {
				return $errors;
			}
			if ( $this->is_mismatch_email_or_phone( $errors, $field ) ) {
				return $errors;
			}
			if ( ! $this->is_valid_otp( $value, $field, $errors ) ) {
				return $errors;
			}
			return $errors;
		}
		/**
		 * Checks to make sure if OTP verification has been started and if
		 * user has sent the OTP to his/her phone or email If not then
		 * show an error message.
		 *
		 * @param array $errors Contains an array of errors to return.
		 * @param mixed $field  Current field information.
		 * @return bool
		 */
		private function has_otp_been_sent( &$errors, $field ) {
			if ( ! SessionUtils::is_otp_initialized( $this->form_session_var ) ) {
				$message = MoMessages::showMessage( BaseMessages::ENTER_VERIFY_CODE );
				if ( $this->is_phone_verification_enabled() ) {
					$errors[ 'field' . $this->getFieldId( 'phone_show', $field ) ] = $message;
				} else {
					$errors[ 'field' . $this->getFieldId( 'email_show', $field ) ] = $message;
				}
				return false;
			}
			return true;
		}
		/**
		 * Check if the email or phone otp was sent to and the email
		 * or phone that was submitted with the form are the same.
		 * If not then show an error message.
		 *
		 * @param array $errors Contains an array of errors to return.
		 * @param mixed $field  Current field information.
		 * @return mixed
		 */
		private function is_mismatch_email_or_phone( &$errors, $field ) {
			$field_id = $this->getFieldId( ( $this->is_phone_verification_enabled() ? 'phone_show' : 'email_show' ), $field );
			if ( ! $this->check_phone_or_email_integrity( $this->field_value ) ) {
				if ( $this->is_phone_verification_enabled() ) {
					$errors[ 'field' . $this->getFieldId( 'phone_show', $field ) ]
					= MoMessages::showMessage( BaseMessages::PHONE_MISMATCH );
				} else {
					$errors[ 'field' . $this->getFieldId( 'email_show', $field ) ]
					= MoMessages::showMessage( BaseMessages::EMAIL_MISMATCH );
				}
				return true;
			}
			return false;
		}
		/**
		 * Calls the {@code mo_validate_otp} hook to validate the otp
		 * being submitted with the form. Throw an error message if
		 * OTP is not valid.
		 *
		 * @param string $value  OTP token entered.
		 * @param mixed  $field  Current field information.
		 * @param array  $errors Contains an array of errors to return.
		 * @return bool
		 */
		private function is_valid_otp( $value, $field, &$errors ) {
			$otp_type = $this->get_verification_type();
			$this->validate_challenge( $otp_type, null, $value );
			if ( SessionUtils::is_status_match( $this->form_session_var, self::VALIDATED, $otp_type ) ) {
				$this->unset_otp_session_variables();
				return true;
			} else {
				$errors[ 'field' . $this->getFieldId( 'verify_show', $field ) ] = MoUtility::get_invalid_otp_method();
				return false;
			}
		}
		/**
		 * Return the Session Variable for which the OTP verification is to
		 * be enabled based on the OTP Type.
		 *
		 * @param string $field_value field vcalues.
		 * @return bool
		 */
		private function check_phone_or_email_integrity( $field_value ) {
			if ( $this->is_phone_verification_enabled() ) {
				$phone = MoUtility::process_phone_number( $field_value );
				return SessionUtils::is_phone_verified_match( $this->form_session_var, $phone );
			} else {
				return SessionUtils::is_email_verified_match( $this->form_session_var, $field_value );
			}
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
			if ( $this->is_form_enabled && $this->is_phone_verification_enabled() ) {
				$selector = array_merge( $selector, $this->phone_form_id );
			}
			return $selector;
		}
		/**
		 * To check if phone verification is enabled
		 *
		 * @return boolean
		 */
		public function is_phone_verification_enabled() {
			return $this->get_verification_type() === VerificationType::PHONE;
		}

		/**
		 * Handles saving all the frm Form related options by the admin.
		 */
		public function handle_form_options() {
			if ( ! MoUtility::are_form_options_being_saved( $this->get_form_option(), 'frm_form_enable' ) ) {
				return;
			}
			$frm_form_data = $this->sanitize_form_post( 'frm_form', '' );
			if ( false === $frm_form_data || ! is_array( $frm_form_data ) ) {
				return;
			}
			$data                  = array( 'frm_form' => $frm_form_data );
			$form                  = $this->parse_form_details( $data );
			$this->is_form_enabled = $this->sanitize_form_post( 'frm_form_enable' );
			$this->otp_type        = $this->sanitize_form_post( 'frm_form_enable_type' );
			$this->form_details    = ! empty( $form ) ? $form : '';
			$this->button_text     = $this->sanitize_form_post( 'frm_button_text' );

			if ( $this->basic_validation_check( BaseMessages::FORMIDABLE_CHOOSE ) ) {
				update_mo_option( 'frm_button_text', $this->button_text );
				update_mo_option( 'frm_form_enable', $this->is_form_enabled );
				update_mo_option( 'frm_form_enable_type', $this->otp_type );
				update_mo_option( 'frm_form_otp_enabled', maybe_serialize( $this->form_details ) );
			}
		}
		/**
		 * To parse the form details from settings page
		 *
		 * @param array $data the data posted while savig the form.
		 *
		 * @return array
		 */
		private function parse_form_details( $data ) {
			$form = array();
			if ( ! array_key_exists( 'frm_form', $data ) ) {
				return array();
			}
			$frm_form_data = isset( $data['frm_form']['form'] ) ? MoUtility::mo_sanitize_array( wp_unslash( $data['frm_form']['form'] ) ) : '';
			foreach ( array_filter( $frm_form_data ) as $key => $value ) {
				$key                                   = sanitize_text_field( $key );
				$form[ sanitize_text_field( $value ) ] = array(
					'emailkey'    => isset( $data['frm_form']['emailkey'][ $key ] ) ? 'frm_field_' . sanitize_text_field( wp_unslash( $data['frm_form']['emailkey'][ $key ] ) ) . '_container' : '',
					'phonekey'    => isset( $data['frm_form']['phonekey'][ $key ] ) ? 'frm_field_' . sanitize_text_field( wp_unslash( $data['frm_form']['phonekey'][ $key ] ) ) . '_container' : '',
					'verifyKey'   => isset( $data['frm_form']['verifyKey'][ $key ] ) ? 'frm_field_' . sanitize_text_field( wp_unslash( $data['frm_form']['verifyKey'][ $key ] ) ) . '_container' : '',
					'phone_show'  => isset( $data['frm_form']['phonekey'][ $key ] ) ? sanitize_text_field( wp_unslash( $data['frm_form']['phonekey'][ $key ] ) ) : '',
					'email_show'  => isset( $data['frm_form']['emailkey'][ $key ] ) ? sanitize_text_field( wp_unslash( $data['frm_form']['emailkey'][ $key ] ) ) : '',
					'verify_show' => isset( $data['frm_form']['verifyKey'][ $key ] ) ? sanitize_text_field( wp_unslash( $data['frm_form']['verifyKey'][ $key ] ) ) : '',
				);
			}
			return $form;
		}
		/**
		 * To get the id of the field from field information
		 *
		 * @param  string $key   either Phone or email.
		 * @param  mixed  $field field data.
		 * @return mixed
		 */
		private function getFieldId( $key, $field ) {
			return $this->form_details[ $field->form_id ][ $key ];
		}
	}
}
