<?php
/**
 * Handles the OTP verification logic for Contact Form 7.
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
use WPCF7_FormTag;
use WPCF7_Submission;
use WPCF7_Validation;

/**
 * This is the Contact Form 7 form class. This class handles all the
 * functionality related to Contact Form 7. It extends the FormHandler
 * and implements the IFormHandler class to implement some much needed functions.
 */
if ( ! class_exists( 'ContactForm7' ) ) {
	/**
	 * ContactForm7 class
	 */
	class ContactForm7 extends FormHandler implements IFormHandler {

		use Instance;

		/**
		 * Initializes values
		 */
		protected function __construct() {
			$this->is_login_or_social_form = false;
			$this->is_ajax_form            = true;
			$this->form_session_var        = FormSessionVars::CF7_FORMS;
			$this->type_phone_tag          = 'mo_cf7_contact_phone_enable';
			$this->type_email_tag          = 'mo_cf7_contact_email_enable';
			$this->form_key                = 'CF7_FORM';
			$this->form_name               = 'Contact Form 7 - Contact Form';
			$this->is_form_enabled         = get_mo_option( 'cf7_contact_enable' );
			$this->generate_otp_action     = 'miniorange-cf7-contact';
			$this->form_documents          = MoFormDocs::CF7_FORM_LINK;
			parent::__construct();
		}
		/**
		 * Function checks if form has been enabled by the admin and initializes
		 * all the class variables. This function also defines all the hooks to
		 * hook into to make OTP Verification possible.
		 */
		public function handle_form() {
			$this->otp_type      = get_mo_option( 'cf7_contact_type' );
			$this->email_key     = get_mo_option( 'cf7_email_key' );
			$this->phone_key     = 'mo_phone';
			$this->phone_form_id = array(
				'.class_' . $this->phone_key,
				'input[name=' . $this->phone_key . ']',
			);

			add_filter( 'wpcf7_validate_text*', array( $this, 'mo_validate_form_post' ), 1, 2 );
			add_filter( 'wpcf7_validate_email*', array( $this, 'mo_validate_form_post' ), 1, 2 );
			add_filter( 'wpcf7_validate_email', array( $this, 'mo_validate_form_post' ), 1, 2 );
			add_filter( 'wpcf7_validate_tel*', array( $this, 'mo_validate_form_post' ), 1, 2 );
			add_action( 'wpcf7_before_send_mail', array( $this, 'unset_session' ), 1, 1 );

			add_action( 'wp_enqueue_scripts', array( $this, 'miniorange_cf7_script' ) );

			add_action( "wp_ajax_nopriv_{$this->generate_otp_action}", array( $this, 'handle_cf7_contact_form' ) );
			add_action( "wp_ajax_{$this->generate_otp_action}", array( $this, 'handle_cf7_contact_form' ) );
		}
		/**
		 * This function is called to process and start the otp verification process.
		 * It's called when user clicks on the Send OTP button on the CF7 form. Data is
		 * passed using an AJAX call.
		 *
		 * @throws ReflectionException Adds exception.
		 */
		public function handle_cf7_contact_form() {
			// Security: Use hardcoded nonce action 'form_nonce' and key 'security' instead of variables.
			if ( ! check_ajax_referer( 'form_nonce', 'security', false ) ) {
				wp_send_json(
					MoUtility::create_json(
						MoMessages::showMessage( MoMessages::INVALID_OP ),
						MoConstants::ERROR_JSON_TYPE
					)
				);
			}
			$post_data = wp_unslash( $_POST );
			$data      = MoUtility::mo_sanitize_array( $post_data );
			MoUtility::initialize_transaction( $this->form_session_var );

			$user_phone = isset( $data['user_phone'] ) && ! empty( $data['user_phone'] ) ? MoUtility::process_phone_number( $data['user_phone'] ) : '';
			if ( strcasecmp( $this->otp_type, $this->type_email_tag ) === 0 && $data['user_email'] ) {
				SessionUtils::add_email_verified( $this->form_session_var, $data['user_email'] );
				$this->send_challenge( 'test', $data['user_email'], null, $data['user_email'], VerificationType::EMAIL );
			} elseif ( strcasecmp( $this->otp_type, $this->type_phone_tag ) === 0 && $data['user_phone'] ) {
				SessionUtils::add_phone_verified( $this->form_session_var, trim( $user_phone ) );
				$this->send_challenge( 'test', '', null, trim( $user_phone ), VerificationType::PHONE );
			} elseif ( strcasecmp( $this->otp_type, $this->type_phone_tag ) === 0 ) {
				wp_send_json(
					MoUtility::create_json(
						MoMessages::showMessage( MoMessages::ENTER_PHONE ),
						MoConstants::ERROR_JSON_TYPE
					)
				);
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
		 * This function hooks into the CF7 filter to validate the form
		 * data before being submitted. This function is used to check the
		 * email and phone numbers being submitted and make sure it is same
		 * as the one otp was sent to.
		 *
		 * @param WPCF7_Validation $result CF7 object passed by the filter.
		 * @param WPCF7_FormTag    $tag    the variable denoting what type of field is being verified.
		 * @return WPCF7_Validation
		 */
		public function mo_validate_form_post( $result, $tag ) {

			$tag  = new WPCF7_FormTag( $tag );
			$name = isset( $tag->name ) ? (string) $tag->name : '';
			// Validate name is not empty before using as array key.
			if ( empty( $name ) ) {
				return $result;
			}

			// Get posted data from Contact Form 7 submission object.
			$submission  = WPCF7_Submission::get_instance();
			$posted_data = array();
			if ( $submission ) {
				$posted_data = $submission->get_posted_data();
			}

			// Get the value for this field from posted data.
			$value = isset( $posted_data[ $name ] ) ? trim( strtr( (string) sanitize_text_field( wp_unslash( $posted_data[ $name ] ) ), "\n", ' ' ) ) : '';

			if ( 'email' === $tag->basetype && $name === $this->email_key && strcasecmp( $this->otp_type, $this->type_email_tag ) === 0 ) {
				SessionUtils::add_email_submitted( $this->form_session_var, $value );
			}
			if ( 'tel' === $tag->basetype && $name === $this->phone_key && strcasecmp( $this->otp_type, $this->type_phone_tag ) === 0 ) {
				$sanitized_phone = MoUtility::process_phone_number( $value );
				SessionUtils::add_phone_submitted( $this->form_session_var, $sanitized_phone );
			}

			if ( 'text' === $tag->basetype && ( 'email_verify' === $name || 'phone_verify' === $name ) ) {
				$this->mo_check_if_verification_code_entered( $name, $result, $tag, $posted_data );
				$this->mo_check_if_verification_not_started( $result, $tag );
				if ( strcasecmp( $this->otp_type, $this->type_email_tag ) === 0 ) {
					$this->mo_process_email( $result, $tag );
				}
				if ( strcasecmp( $this->otp_type, $this->type_phone_tag ) === 0 ) {
					$this->process_phone_number( $result, $tag );
				}
				if ( empty( $result->get_invalid_fields() ) ) {
					if ( ! $this->mo_process_otp_entered( $name, $posted_data ) ) {
						$result->invalidate( $tag, MoUtility::get_invalid_otp_method() );
					}
				}
			}
			return $result;
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
		 * Process and validate the OTP entered by the user
		 *
		 * @param string $name request variable against which otp is sent.
		 * @param array  $posted_data Posted form data from CF7 submission.
		 * @return bool
		 */
		private function mo_process_otp_entered( $name, $posted_data = array() ) {
			// Get OTP value from posted data instead of $_POST.
			$otp_value    = isset( $posted_data[ $name ] ) ? sanitize_text_field( wp_unslash( $posted_data[ $name ] ) ) : '';
			$otp_ver_type = $this->get_verification_type();
			if ( ! SessionUtils::is_status_match( $this->form_session_var, self::VALIDATED, $otp_ver_type ) ) {
				// Pass OTP value directly to validate_challenge instead of relying on $_POST.
				$this->validate_challenge( $otp_ver_type, $name, $otp_value );
			}
			return SessionUtils::is_status_match( $this->form_session_var, self::VALIDATED, $otp_ver_type );
		}

		/**
		 * Process the Email . Check to see if email address OTP was sent to and
		 * the phone number submitted in the final form submission are the same.
		 *
		 * @param WPCF7_Validation $result form result.
		 * @param WPCF7_FormTag    $tag form ags.
		 */
		private function mo_process_email( &$result, $tag ) {
			if ( ! SessionUtils::is_email_submitted_and_verified_match( $this->form_session_var ) ) {
				$result->invalidate( $tag, MoMessages::showMessage( MoMessages::EMAIL_MISMATCH ) );
			}
		}
		/**
		 * Process the Email . Check to see if phone number OTP was sent to and
		 * the phone number submitted in the final form submission are the same.
		 *
		 * @param WPCF7_Validation $result form result.
		 * @param WPCF7_FormTag    $tag form ags.
		 */
		private function process_phone_number( &$result, $tag ) {
			if ( ! SessionUtils::is_phone_submitted_and_verified_match( $this->form_session_var ) ) {
				$result->invalidate( $tag, MoMessages::showMessage( MoMessages::PHONE_MISMATCH ) );
			}
		}

		/**
		 * This functions checks if Verification was started. Returns TRUE
		 * or FALSE. This is to ensure user verifies himself before
		 * submitting the form.
		 *
		 * @param WPCF7_Validation $result form result.
		 * @param WPCF7_FormTag    $tag form tags.
		 */
		private function mo_check_if_verification_not_started( &$result, $tag ) {
			if ( ! SessionUtils::is_otp_initialized( $this->form_session_var ) ) {
				$result->invalidate( $tag, MoMessages::showMessage( MoMessages::PLEASE_VALIDATE ) );
			}
		}
		/**
		 * This function checks if verification codes was entered in the form
		 * by the user. Returns TRUE or FALSE. Makes sure OTP was entered.
		 *
		 * @param string           $name the request meta key.
		 * @param WPCF7_Validation $result form result.
		 * @param WPCF7_FormTag    $tag form tags.
		 * @param array            $posted_data Posted form data from CF7 submission.
		 * @return void
		 */
		private function mo_check_if_verification_code_entered( $name, &$result, $tag, $posted_data = array() ) {
			if ( ! MoUtility::sanitize_check( $name, $posted_data ) ) {
				if ( function_exists( 'wpcf7_get_message' ) ) {
					$result->invalidate( $tag, wpcf7_get_message( 'invalid_required' ) );
				} else {
					$result->invalidate( $tag, MoMessages::showMessage( MoMessages::ENTER_VERIFY_CODE ) );
				}
			}
		}

		/**
		 * This function registers the js file for enabling OTP Verification
		 * for Contact Form 7 using AJAX calls.
		 */
		public function miniorange_cf7_script() {
			wp_register_script( 'mocf7', MOV_URL . 'includes/js/mocf7.js', array( 'jquery' ), MOV_VERSION, true );
			wp_localize_script(
				'mocf7',
				'mocf7',
				array(
					'siteURL' => admin_url( 'admin-ajax.php' ),
					'otpType' => sanitize_text_field( wp_unslash( $this->otp_type ) ),
					'nonce'   => wp_create_nonce( $this->nonce ),
					'field'   => $this->otp_type === $this->type_phone_tag ? 'mo_phone' : sanitize_text_field( wp_unslash( $this->email_key ) ),
					'gaction' => sanitize_key( wp_unslash( $this->generate_otp_action ) ),
				)
			);
			wp_enqueue_script( 'mocf7' );
		}


		/**
		 * Unset all the session variables so that a new form submission starts
		 * a fresh process of OTP verification.
		 *
		 * @param string $result of response.
		 */
		public function unset_session( $result ) {
			$this->unset_otp_session_variables();
			return $result;
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
		 * @param array|string $selector The Jquery selector to be modified.
		 * @return array The modified selector array.
		 */
		public function get_phone_number_selector( $selector ) {
			// Ensure selector is an array.
			if ( ! is_array( $selector ) ) {
				$selector = array();
			}

			if ( $this->is_form_enabled && ( $this->otp_type === $this->type_phone_tag ) ) {
				$selector = array_merge( $selector, $this->phone_form_id );
			}
			return $selector;
		}

		/**
		 * Check to ensure that admin has provided an email Key when opting for Email Verification
		 *
		 *  @return bool
		 */
		private function mo_email_key_validation_check() {
			if ( $this->otp_type === $this->type_email_tag && MoUtility::is_blank( $this->email_key ) ) {
				do_action(
					'mo_registration_show_message',
					MoMessages::showMessage( BaseMessages::CF7_PROVIDE_EMAIL_KEY ),
					MoConstants::ERROR
				);
				return false;
			}
			return true;
		}

		/**
		 *  Handles saving all the CF7 form related options by the admin.
		 */
		public function handle_form_options() {
			if ( ! MoUtility::are_form_options_being_saved( $this->get_form_option(), 'cf7_contact_enable' ) ) {
				return;
			}
			$this->is_form_enabled = $this->sanitize_form_post( 'cf7_contact_enable' );
			$this->otp_type        = $this->sanitize_form_post( 'cf7_contact_type' );
			$this->email_key       = $this->sanitize_form_post( 'cf7_email_field_key' );

			if ( $this->basic_validation_check( BaseMessages::CF7_CHOOSE )
			&& $this->mo_email_key_validation_check() ) {
				update_mo_option( 'cf7_contact_enable', $this->is_form_enabled );
				update_mo_option( 'cf7_contact_type', $this->otp_type );
				update_mo_option( 'cf7_email_key', $this->email_key );
			}
		}
	}
}
