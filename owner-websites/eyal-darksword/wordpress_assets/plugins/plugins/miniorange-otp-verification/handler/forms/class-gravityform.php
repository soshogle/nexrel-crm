<?php
/**
 * Gravity Form handler.
 *
 * @package miniorange-otp-verification/handler/forms
 */

namespace OTP\Handler\Forms;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

use GF_Field;
use GFAPI;
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
 * This is the Gravity Form class. This class handles all the
 * functionality related to Gravity Forms. It extends the FormHandler
 * and implements the IFormHandler class to implement some much needed functions.
 */
if ( ! class_exists( 'GravityForm' ) ) {
	/**
	 * GravityForm class
	 */
	class GravityForm extends FormHandler implements IFormHandler {

		use Instance;

		/**
		 * Add button_class value.
		 *
		 * @var string $button_css
		 */
		public $button_css;

		/**
		 * Initializes values.
		 */
		protected function __construct() {
			$this->is_login_or_social_form = false;
			$this->is_ajax_form            = true;
			$this->form_session_var        = FormSessionVars::GF_FORMS;
			$this->type_phone_tag          = 'mo_gf_contact_phone_enable';
			$this->type_email_tag          = 'mo_gf_contact_email_enable';
			$this->form_key                = 'GRAVITY_FORM';
			$this->form_name               = 'Gravity Form';
			$this->is_form_enabled         = get_mo_option( 'gf_contact_enable' );
			$this->phone_form_id           = '.ginput_container_phone';
			$this->button_text             = get_mo_option( 'gf_button_text' );
			$this->button_text             = ! MoUtility::is_blank( $this->button_text ) ? $this->button_text : '';
			$this->generate_otp_action     = 'mo_gravity_send_otp';
			$this->button_css              = get_mo_option( 'gf_button_css' );
			$this->form_documents          = MoFormDocs::GF_FORM_LINK;
			parent::__construct();
		}

		/**
		 * Function checks if form has been enabled by the admin and initializes
		 * all the class variables. This function also defines all the hooks to
		 * hook into to make OTP Verification possible.
		 */
		public function handle_form() {
			$this->otp_type     = get_mo_option( 'gf_contact_type' );
			$this->form_details = maybe_unserialize( get_mo_option( 'gf_otp_enabled' ) );
			if ( empty( $this->form_details ) ) {
				return;
			}
			add_action( 'wp_enqueue_scripts', array( $this, 'miniorange_gravity_script' ) );
			add_filter( 'gform_field_validation', array( $this, 'validate_form_submit' ), 1, 5 );
			add_action( 'gform_pre_submission', array( $this, 'mo_gravity_unset_session' ) );
			add_action( 'wp_ajax_nopriv_' . $this->generate_otp_action, array( $this, 'mo_handle_gf_form' ) );
			add_action( 'wp_ajax_' . $this->generate_otp_action, array( $this, 'mo_handle_gf_form' ) );
		}

		/**
		 * Start the OTP Verification process via AJAX.
		 *
		 * Initializes the required session variables and starts the OTP Verification process.
		 *
		 * @return void
		 */
		public function mo_handle_gf_form() {

			// Verify AJAX nonce without dying to allow JSON error response.
			// Security: Use hardcoded nonce action 'form_nonce' and key 'security' instead of variables.
			if ( ! check_ajax_referer( 'form_nonce', 'security', false ) ) {
				wp_send_json(
					MoUtility::create_json(
						MoMessages::showMessage( MoMessages::INVALID_OP ),
						MoConstants::ERROR_JSON_TYPE
					)
				);
			}

			$get_data = MoUtility::mo_sanitize_array( wp_unslash( $_POST ) );

			MoUtility::initialize_transaction( $this->form_session_var );

			if ( $this->otp_type === $this->type_email_tag ) {
				$this->processEmailAndStartOTPVerificationProcess( $get_data );
			}
			if ( $this->otp_type === $this->type_phone_tag ) {
				$this->processPhoneAndStartOTPVerificationProcess( $get_data );
			}
		}

		/**
		 * This function registers the js file for enabling OTP Verification
		 * for Gravity using AJAX calls.
		 */
		public function miniorange_gravity_script() {
			wp_register_script( 'mogravity', MOV_URL . 'includes/js/mogravity.js', array( 'jquery' ), MOV_VERSION, true );
			wp_localize_script(
				'mogravity',
				'mogravity',
				array(
					'siteURL'           => admin_url( 'admin-ajax.php' ),
					'nonce'             => wp_create_nonce( $this->nonce ),
					'otpType'           => $this->otp_type,
					'buttonText'        => $this->button_text,
					'buttonCSS'         => $this->button_css,
					'phonefield'        => $this->phone_key,
					'emailfield'        => $this->email_key,
					'gaction'           => $this->generate_otp_action,
					'formDetails'       => $this->form_details,
					'isDropdownEnabled' => get_mo_option( 'show_dropdown_on_form' ),
				)
			);
			wp_enqueue_script( 'mogravity' );
		}

		/**
		 * This function is called to check if email verification has been enabled in the settings
		 * and start the OTP Verification process. Keeps the email otp was sent to in session so
		 * that it can verified later.
		 *
		 * @param array $get_data Data sent in AJAX call for OTP verification.
		 *
		 * @return void
		 */
		private function processEmailAndStartOTPVerificationProcess( $get_data ) {
			if ( MoUtility::sanitize_check( 'user_email', $get_data ) ) {
				$user_email = $get_data['user_email'];
				SessionUtils::add_email_verified( $this->form_session_var, $user_email );
				$this->send_challenge( '', $user_email, null, $user_email, VerificationType::EMAIL );
			} else {
				wp_send_json(
					MoUtility::create_json(
						MoMessages::showMessage( MoMessages::ENTER_EMAIL ),
						MoConstants::ERROR_JSON_TYPE
					)
				);
			}
		}
		/**
		 * Start phone OTP verification if enabled. Stores the phone in session for validation.
		 *
		 * @param array $get_data Data sent in AJAX call for OTP verification.
		 *
		 * @return void
		 */
		private function processPhoneAndStartOTPVerificationProcess( $get_data ) {
			if ( MoUtility::sanitize_check( 'user_phone', $get_data ) ) {
				$phone = MoUtility::process_phone_number( $get_data['user_phone'] );
				SessionUtils::add_phone_verified( $this->form_session_var, $phone );
				$this->send_challenge( '', '', null, $phone, VerificationType::PHONE );
			} else {
				wp_send_json(
					MoUtility::create_json(
						MoMessages::showMessage( MoMessages::ENTER_PHONE ),
						MoConstants::ERROR_JSON_TYPE
					)
				);
			}
		}
		/**
		 * This function is used to unset OTP session after all the validations of the form are completed.
		 *
		 * @param object $form - the entire form variable having all form related information.
		 */
		public function mo_gravity_unset_session( $form ) {
			if ( SessionUtils::is_status_match( $this->form_session_var, self::VALIDATED, $this->get_verification_type() ) ) {
					$this->unset_otp_session_variables();
			}
		}
		/**
		 * This function hooks into the gform_field_validation hook to verify the
		 * form submission and validate the otp being submitted. This hook is called
		 * for each field on the form for validation.
		 *
		 * @param string $error - denotes if there are any form related errors for the field.
		 * @param string $value - denotes the value of the field being submitted.
		 * @param string $form - the entire form variable having all form related information.
		 * @param object $field - the entire field variable having all the field information.
		 * @return array
		 */
		public function validate_form_submit( $error, $value, $form, $field ) {
			$form_id      = 'formId';
			$form_datails = MoUtility::sanitize_check( $field->$form_id, $this->form_details );

			if ( ! $form_datails || ! array_key_exists( $field->{$form_id}, $this->form_details ) ) {
				return $error;
			}

			if ( isset( $form_datails['verifyKey'] ) && strpos( $field->label, $form_datails['verifyKey'] ) !== false ) {
				if ( ! SessionUtils::is_otp_initialized( $this->form_session_var ) ) {
					return array(
						'is_valid' => false,
						'message'  => MoMessages::showMessage( MoMessages::PLEASE_VALIDATE ),
					);
				} elseif ( ! SessionUtils::is_status_match( $this->form_session_var, self::VALIDATED, $this->get_verification_type() ) ) {
					return $this->validate_otp( $error, $value );
				} else {
					$error['is_valid'] = true;
					return $error;
				}
			}

			if ( $form_datails && array_key_exists( $field->{$form_id}, $this->form_details ) ) {
				$is_email_or_phone_field = $this->isEmailOrPhoneField( $field, $form_datails );

				if ( ! $is_email_or_phone_field ) {
					if ( $this->otp_type === $this->type_email_tag ) {
						if ( ( isset( $field->type ) && 'email' === $field->type )
							|| ( isset( $form_datails['email_show'] ) && ! empty( $form_datails['email_show'] ) && $field->label === $form_datails['email_show'] ) ) {
							$is_email_or_phone_field = true;
						}
					} elseif ( $this->otp_type === $this->type_phone_tag ) {
						if ( ( isset( $field->type ) && 'phone' === $field->type )
							|| ( isset( $form_datails['phone_show'] ) && ! empty( $form_datails['phone_show'] ) && $field->label === $form_datails['phone_show'] ) ) {
							$is_email_or_phone_field = true;
						}
					}
				}

				if ( $is_email_or_phone_field ) {
					if ( SessionUtils::is_status_match( $this->form_session_var, self::VALIDATED, $this->get_verification_type() ) ) {
						$error = $this->validate_submitted_email_or_phone( $error['is_valid'], $value, $error );
						if ( isset( $error['is_valid'] ) && ( false === $error['is_valid'] || null === $error['is_valid'] ) ) {
							SessionUtils::add_status( $this->form_session_var, self::VERIFICATION_FAILED, $this->get_verification_type() );
						}
					} elseif ( SessionUtils::is_otp_initialized( $this->form_session_var ) ) {
						$error = $this->validate_submitted_email_or_phone( $error['is_valid'], $value, $error );
					} elseif ( true === $error['is_valid'] ) {
						$error = array(
							'is_valid' => false,
							'message'  => MoMessages::showMessage( MoMessages::PLEASE_VALIDATE ),
						);
					}
				}
			}
			return $error;
		}
		/**
		 * This function is used to validate the form being submitted and
		 * check if the OTP entered by the user is valid.
		 *
		 * @param string $error shows form error.
		 * @param string $value to give values.
		 *
		 * @return array
		 */
		private function validate_otp( $error, $value ) {
			$otp_type = $this->get_verification_type();
			if ( MoUtility::is_blank( $value ) ) {
				$error = array(
					'is_valid' => null,
					'message'  => MoUtility::get_invalid_otp_method(),
				);
			} else {
				$this->validate_challenge( $otp_type, null, $value );
				if ( ! SessionUtils::is_status_match( $this->form_session_var, self::VALIDATED, $otp_type ) ) {
					$error = array(
						'is_valid' => null,
						'message'  => MoUtility::get_invalid_otp_method(),
					);
				}
			}
			return $error;
		}
		/**
		 * This function is called to validate that the number or the email
		 * validation otp was sent to and the final number or the email being
		 * submitted are the same.
		 *
		 * @param string $is_valid - this variable denotes if the form field is valid.
		 * @param string $value - this variable has the value of the field.
		 * @param string $error - this variable denotes if there's any error in form submission.
		 * @return array
		 */
		private function validate_submitted_email_or_phone( $is_valid, $value, $error ) {
			$otp_type = $this->get_verification_type();
			if ( $is_valid ) {
				if ( VerificationType::EMAIL === $otp_type && ! SessionUtils::is_email_verified_match( $this->form_session_var, $value ) ) {
					return array(
						'is_valid' => false,
						'message'  => MoMessages::showMessage( MoMessages::EMAIL_MISMATCH ),
					);
				} elseif ( VerificationType::PHONE === $otp_type ) {
					$phone = MoUtility::process_phone_number( $value );
					if ( ! SessionUtils::is_phone_verified_match( $this->form_session_var, $phone ) ) {
						return array(
							'is_valid' => false,
							'message'  => MoMessages::showMessage( MoMessages::PHONE_MISMATCH ),
						);
					}
				}
			}
			return $error;
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
		 * @param  array $selector - the Jquery selector to be modified.
		 * @return array
		 */
		public function get_phone_number_selector( $selector ) {

			if ( $this->is_form_enabled() && $this->otp_type === $this->type_phone_tag ) {
				foreach ( $this->form_details as $key => $form_detail ) {
					$phone_field = sprintf( '%s_%d_%d', 'input', $key, $form_detail['phonekey'] );
					array_push( $selector, sprintf( '%s #%s', $this->phone_form_id, $phone_field ) );
				}
			}
			return $selector;
		}
		/**
		 * Handles saving all the Gravity form related options by the admin.
		 */
		public function handle_form_options() {
			if ( ! MoUtility::are_form_options_being_saved( $this->get_form_option(), 'gf_contact_enable' ) ) {
				return;
			}
			$form_raw = $this->sanitize_form_post( 'gravity_form', '' );
			if ( empty( $form_raw ) ) {
				return;
			}

			if ( $this->sanitize_form_post( 'gf_contact_enable' ) && ! MoUtility::get_active_plugin_version( 'Gravity Forms' ) ) {
				$message = MoMessages::showMessage( MoMessages::PLUGIN_INSTALL, array( 'formname' => $this->form_name ) );
				do_action( 'mo_registration_show_message', $message, MoConstants::ERROR );
				return;
			}
			$this->is_form_enabled = $this->sanitize_form_post( 'gf_contact_enable' );
			$this->otp_type        = $this->sanitize_form_post( 'gf_contact_type' );
			$this->button_text     = $this->sanitize_form_post( 'gf_button_text' );
			$this->button_css      = $this->sanitize_form_post( 'gf_button_css' );
			$form_details          = $this->mo_parse_form_details( $form_raw );

			$this->form_details = is_array( $form_details ) ? $form_details : '';

			update_mo_option( 'gf_otp_enabled', maybe_serialize( $this->form_details ) );
			update_mo_option( 'gf_contact_enable', $this->is_form_enabled );
			update_mo_option( 'gf_contact_type', $this->otp_type );
			update_mo_option( 'gf_button_text', $this->button_text );
			update_mo_option( 'gf_button_css', $this->button_css );
		}
		/**
		 * Parse the form details and create an array containing form details for
		 * OTP Verification.
		 *
		 * @param array $data the data posted while savig the form.
		 *
		 * @return array
		 */
		private function mo_parse_form_details( $data ) {
			if ( empty( $data['form'] ) ) {
				return array();
			}
			$form          = array();
			$get_field_key = function ( $field_details, $field_label, $type ) {
				foreach ( $field_details as $field ) {
					if ( get_class( $field ) === $type
					&& $field['label'] === $field_label ) {
						return $field['id'];
					}
				}
				return null;
			};

			foreach ( array_filter( $data['form'] ) as $key => $value ) {
				$form_data      = GFAPI::get_form( $value );
				$email_key      = isset( $data['emailkey'][ $key ] ) ? ( $data['emailkey'][ $key ] ) : '';
				$phone_key      = isset( $data['phonekey'][ $key ] ) ? ( $data['phonekey'][ $key ] ) : '';
				$form[ $value ] = array(
					'emailkey'    => $get_field_key( $form_data['fields'], $email_key, 'GF_Field_Email' ),
					'phonekey'    => $get_field_key( $form_data['fields'], $phone_key, 'GF_Field_Phone' ),
					'verifyKey'   => isset( $data['verifyKey'][ $key ] ) ? ( $data['verifyKey'][ $key ] ) : '',
					'phone_show'  => isset( $data['phonekey'][ $key ] ) ? ( $data['phonekey'][ $key ] ) : '',
					'email_show'  => isset( $data['emailkey'][ $key ] ) ? ( $data['emailkey'][ $key ] ) : '',
					'verify_show' => isset( $data['verifyKey'][ $key ] ) ? ( $data['verifyKey'][ $key ] ) : '',
				);
			}
			return $form;
		}
		/**
		 * Checks if the field passed is an email or phone field
		 *
		 * @param object $field    GF_Field   Gravity forms field object.
		 * @param string $f        array      FormDetails saved by the admin for otp verification.
		 * @return bool true or false
		 */
		private function isEmailOrPhoneField( $field, $f ) {
			return ( $this->otp_type === $this->type_phone_tag && $field->id === $f['phonekey'] )
			|| ( $this->otp_type === $this->type_email_tag && $field->id === $f['emailkey'] );
		}
	}
}
