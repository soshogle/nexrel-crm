<?php
/**
 * Handles the OTP verification logic for MemberPressSingleCheckout form.
 *
 * @package miniorange-otp-verification/handler/forms
 */

namespace OTP\Handler\Forms;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}
use OTP\Helper\FormSessionVars;
use OTP\Helper\MoFormDocs;
use OTP\Helper\MoMessages;
use OTP\Helper\MoUtility;
use OTP\Helper\SessionUtils;
use OTP\Helper\MoConstants;
use OTP\Objects\BaseMessages;
use OTP\Objects\FormHandler;
use OTP\Objects\IFormHandler;
use OTP\Objects\VerificationLogic;
use OTP\Objects\VerificationType;
use OTP\Traits\Instance;

/**
 * This is the Member-Press SingleCheckoutForm class. This class handles all the
 * functionality related to Member-Press Checkout. It extends the FormHandler
 * class to implement some much needed functions.
 */
if ( ! class_exists( 'MemberPressSingleCheckoutForm' ) ) {
	/**
	 * MemberPressSingleCheckoutForm class
	 */
	class MemberPressSingleCheckoutForm extends FormHandler implements IFormHandler {

		use Instance;

		/**
		 * Initializes values
		 */
		protected function __construct() {
			$this->is_login_or_social_form = false;
			$this->is_ajax_form            = true;
			$this->form_session_var        = FormSessionVars::MEMBERPRESS_SINGLE_REG;
			$this->type_phone_tag          = 'mo_mrp_single_phone_enable';
			$this->type_email_tag          = 'mo_mrp_single_email_enable';
			$this->type_both_tag           = 'mo_mrp_single_both_enable';
			$this->form_name               = 'MemberPress Single Checkout Registration Form';
			$this->form_key                = 'MEMBERPRESSSINGLECHECKOUT';
			$this->is_form_enabled         = get_mo_option( 'mrp_single_default_enable' );
			$this->form_documents          = MoFormDocs::MRP_FORM_LINK;
			parent::__construct();
		}

		/**
		 * Function checks if form has been enabled by the admin and initializes
		 * all the class variables. This function also defines all the hooks to
		 * hook into to make OTP Verification possible.
		 *
		 * @return void
		 */
		public function handle_form() {
			$this->by_pass_login = get_mo_option( 'mrp_single_anon_only' );
			$this->phone_key     = get_mo_option( 'mrp_single_phone_key' );
			$this->otp_type      = get_mo_option( 'mrp_single_enable_type' );
			$this->phone_form_id = 'input[name=' . $this->phone_key . ']';

			$user = wp_get_current_user();
			if ( $user->exists() ) {
				return;
			}

			add_action( 'wp_ajax_momrp_single_send_otp', array( $this, 'mo_send_otp' ) );
			add_action( 'wp_ajax_nopriv_momrp_single_send_otp', array( $this, 'mo_send_otp' ) );

			add_filter( 'mepr-validate-signup', array( $this, 'miniorange_site_register_form' ), 99, 1 );
			add_action( 'wp_enqueue_scripts', array( $this, 'miniorange_single_checkout_register_script' ) );
			add_action( 'mepr-checkout-before-submit', array( $this, 'render_memberpress_checkout_nonce' ) );

			add_action( 'user_register', array( $this, 'unset_mepr_single_checkout_session_variables' ), 99, 2 );
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
						MoMessages::showMessage( MoMessages::INVALID_OP ),
						MoConstants::ERROR_JSON_TYPE
					)
				);
			}
			$data = MoUtility::mo_sanitize_array( $_POST );

			MoUtility::initialize_transaction( $this->form_session_var );
			if ( $this->otp_type === $this->type_phone_tag ) {
				$this->mo_process_phone_and_start_otp_verification_process( $data );
			} else {
				$this->mo_process_email_and_start_otp_verification_process( $data );
			}
		}

		/**
		 * Start the verification process. Check the phone number provided by the user and
		 * start the OTP Verification process.
		 *
		 * @param array $data Data provided by the user.
		 * @return void
		 */
		private function mo_process_phone_and_start_otp_verification_process( $data ) {
			if ( ! MoUtility::sanitize_check( 'user_phone', $data ) ) {
				wp_send_json_error(
					array(
						'message' => MoMessages::showMessage( MoMessages::ENTER_PHONE ),
					),
					400
				);
				return;
			}
			$raw_phone = isset( $data['user_phone'] ) ? (string) $data['user_phone'] : '';
			$phone     = MoUtility::process_phone_number( $raw_phone );
			$this->set_session_and_start_otp_verification( $phone, null, $phone, VerificationType::PHONE );
		}

		/**
		 * Start the verification process. Check the email provided by the user and
		 * start the OTP Verification process.
		 *
		 * @param array $data data provided by the user.
		 * @return void
		 */
		private function mo_process_email_and_start_otp_verification_process( $data ) {
			if ( ! MoUtility::sanitize_check( 'user_email', $data ) ) {
				wp_send_json_error(
					array(
						'message' => MoMessages::showMessage( MoMessages::ENTER_EMAIL ),
					),
					400
				);
				return;
			} else {
				$this->set_session_and_start_otp_verification( $data['user_email'], $data['user_email'], null, VerificationType::EMAIL );
			}
		}

		/**
		 * Undocumented function
		 *
		 * @param array $session_value set the session for the user.
		 * @param array $user_email the  email posted by the user.
		 * @param array $phone_number the phone number posted by the user.
		 * @param array $otp_type email and sms verification.
		 * @return void
		 */
		private function set_session_and_start_otp_verification( $session_value, $user_email, $phone_number, $otp_type ) {
			SessionUtils::add_email_or_phone_verified( $this->form_session_var, $session_value, $otp_type );
			$this->send_challenge( '', $user_email, null, $phone_number, $otp_type );
		}


		/**
		 * This function registers the js file for enabling OTP Verification
		 * for Memberpress Checkout using AJAX calls.
		 *
		 * @return void
		 */
		public function miniorange_single_checkout_register_script() {
			wp_register_script( 'momrpsingle', MOV_URL . 'includes/js/momrpsingle.js', array( 'jquery' ), MOV_VERSION, true );
			wp_localize_script(
				'momrpsingle',
				'momrpsingle',
				array(
					'siteURL'         => admin_url( 'admin-ajax.php' ),
					'otpType'         => $this->otp_type,
					'formkey'         => strcasecmp( $this->otp_type, $this->type_phone_tag ) === 0 ? $this->phone_key : 'user_email',
					'nonce'           => wp_create_nonce( $this->nonce ),
					'buttontext'      => __( 'Click Here to send OTP', 'miniorange-otp-verification' ),
					'verifycodelabel' => __( 'Enter Verification Code:*', 'miniorange-otp-verification' ),
					'validationerror' => __( 'Verification Code Required', 'miniorange-otp-verification' ),
				)
			);
			wp_enqueue_script( 'momrpsingle' );
		}

		/**
		 * Function checks if form has been enabled by the admin and initializes
		 * all the class variables. This function also defines all the hooks to
		 * hook into to make OTP Verification possible.
		 *
		 * @param array $errors checkout errors.
		 */
		public function miniorange_site_register_form( $errors ) {
			$errors = is_array( $errors ) ? $errors : array();
			if ( ! empty( $errors ) ) {
				return $errors;
			}

			$mov_nonce = isset( $_POST['mov_nonce'] ) ? sanitize_text_field( wp_unslash( $_POST['mov_nonce'] ) ) : '';
			if ( empty( $mov_nonce ) || ! wp_verify_nonce( $mov_nonce, 'mov_mrp_validate' ) ) {
				$errors = new WP_Error(
					'registration-error-invalid-nonce',
					MoMessages::showMessage( MoMessages::INVALID_OP )
				);
				return $errors;
			}

			$is_phone = ( 0 === strcasecmp( $this->otp_type, $this->type_phone_tag ) );

			if ( ! SessionUtils::is_otp_initialized( $this->form_session_var ) ) {
				$errors[ $is_phone ? $this->phone_key : 'user_email' ] = MoMessages::showMessage( MoMessages::ENTER_VERIFY_CODE );
				return $errors;
			}

			if ( ! empty( $errors ) ) {
				return $errors;
			}

			$email = isset( $_POST['user_email'] ) ? sanitize_email( wp_unslash( $_POST['user_email'] ) ) : '';

			if ( $is_phone ) {
				$raw_phone = isset( $_POST[ $this->phone_key ] ) ? sanitize_text_field( wp_unslash( $_POST[ $this->phone_key ] ) ) : '';
				$phone     = MoUtility::process_phone_number( $raw_phone );
				if ( ! SessionUtils::is_phone_verified_match( $this->form_session_var, $phone ) ) {
					$errors[ $this->phone_key ] = MoMessages::showMessage( MoMessages::PHONE_MISMATCH );
				}
			} elseif ( ! SessionUtils::is_email_verified_match( $this->form_session_var, $email ) ) {
					$errors['user_email'] = MoMessages::showMessage( MoMessages::EMAIL_MISMATCH );
			}

			if ( ! empty( $errors ) ) {
				return $errors;
			}

			$otp_type = $is_phone ? 'phone' : 'email';

			$mo_verify_otp_field = isset( $_POST['mo_verify_otp_field'] ) ? sanitize_text_field( wp_unslash( $_POST['mo_verify_otp_field'] ) ) : '';
			if ( '' !== $mo_verify_otp_field ) {
				$this->validate_challenge( $otp_type, null, $mo_verify_otp_field );
			}

			if ( ! SessionUtils::is_status_match( $this->form_session_var, self::VALIDATED, $otp_type ) ) {
				$errors[ $is_phone ? $this->phone_key : 'user_email' ] = MoMessages::showMessage( MoMessages::INVALID_OTP );
			}

			return $errors;
		}

		/**
		 * Render MemberPress checkout nonce field.
		 *
		 * @return void
		 */
		public function render_memberpress_checkout_nonce() {
			wp_nonce_field( 'mov_mrp_validate', 'mov_nonce' );
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
		 * This function is called by the filter mo_phone_dropdown_selector
		 * to return the Jquery selector of the phone field. The function will
		 * push the formID to the selector array if OTP Verification for the
		 * form has been enabled.
		 *
		 * @param array $selector - the Jquery selector to be modified.
		 * @return array $selector - the Jquery selector to be modified.
		 */
		public function get_phone_number_selector( $selector ) {

			if ( self::is_form_enabled() && $this->isPhoneVerificationEnabled() ) {
				array_push( $selector, $this->phone_form_id );
			}
			return $selector;
		}

		/**
		 * This is a utility function specific to this class which checks if
		 * SMS Verification has been enabled by the admin for MemberPress Registration
		 * form
		 */
		private function isPhoneVerificationEnabled() {
			$otp_type = $this->get_verification_type();
			return VerificationType::PHONE === $otp_type || VerificationType::BOTH === $otp_type;
		}

		/**
		 * MermberPress Checkout function to register the user.
		 *
		 * @param array $user_id WP User id.
		 * @param array $userdata gives user information.
		 * @return void
		 */
		public function unset_mepr_single_checkout_session_variables( $user_id, $userdata ) {
			$this->unset_otp_session_variables();
		}

		/**
		 * Unset all the session variables so that a new form submission starts
		 * a fresh process of OTP verification.
		 */
		public function unset_otp_session_variables() {
			SessionUtils::unset_session( array( $this->tx_session_id, $this->form_session_var ) );
		}


		/**
		 * Handles saving all the MemberPress Checkout form related options by the admin.
		 *
		 * @return void
		 */
		public function handle_form_options() {
			if ( ! MoUtility::are_form_options_being_saved( $this->get_form_option(), 'mrp_single_default_enable' ) ) {
				return;
			}
			if ( get_mo_option( 'mrp_default_enable' ) ) {
				do_action( 'mo_registration_show_message', __( 'Disable MemberPress Registration Form to enable OTP verification on MemberPress Checkout Form ', 'miniorange-otp-verification' ), MoConstants::ERROR_JSON_TYPE );
				return;
			}
			$this->is_form_enabled = $this->sanitize_form_post( 'mrp_single_default_enable' );
			$this->otp_type        = $this->sanitize_form_post( 'mrp_single_enable_type' );
			$this->phone_key       = $this->sanitize_form_post( 'mrp_single_phone_field_key' );
			$this->by_pass_login   = $this->sanitize_form_post( 'mpr_single_anon_only' );

			if ( $this->basic_validation_check( BaseMessages::MEMBERPRESS_CHOOSE ) ) {
				update_mo_option( 'mrp_single_default_enable', $this->is_form_enabled );
				update_mo_option( 'mrp_single_enable_type', $this->otp_type );
				update_mo_option( 'mrp_single_phone_key', $this->phone_key );
				update_mo_option( 'mrp_single_anon_only', $this->by_pass_login );
			}
		}
	}
}
