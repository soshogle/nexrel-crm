<?php
/**
 * Form Action Handler.
 *
 * @package miniorange-otp-verification/handler
 */

namespace OTP\Handler;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
use OTP\Helper\FormSessionVars;
use OTP\Helper\GatewayFunctions;
use OTP\Helper\MoMessages;
use OTP\Helper\MoPHPSessions;
use OTP\Helper\MoUtility;
use OTP\Helper\SessionUtils;
use OTP\Objects\BaseActionHandler;
use OTP\Objects\VerificationType;
use OTP\Traits\Instance;
use OTP\Helper\MoConstants;
/**
 * This is the Custom Form class. This class handles all the
 * functionality related to Custom Form. It extends the FormHandler
 * and implements the IFormHandler class to implement some much needed functions.
 */
if ( ! class_exists( 'FormActionHandler' ) ) {
	/**
	 * FormActionHandler class
	 */
	class FormActionHandler extends BaseActionHandler {

		use Instance;

		/**
		 * Initializes values
		 */
		protected function __construct() {
			parent::__construct();
			add_action( 'init', array( $this, 'handle_formActions' ), 1 );
			add_action( 'mo_validate_otp', array( $this, 'validateOTP' ), 1, 3 );
			add_action( 'mo_generate_otp', array( $this, 'challenge' ), 2, 9 );
			add_filter( 'mo_filter_phone_before_api_call', array( $this, 'filterPhone' ), 1, 1 );
		}

		/**
		 * This function is called from every form handler class to start the OTP
		 * Verification process. Keeps certain variables in session and start the
		 * OTP Verification process.
		 *
		 * @param string $user_login    username submitted by the user.
		 * @param string $user_email    email submitted by the user.
		 * @param string $errors        error variable ( currently not being used ).
		 * @param string $phone_number  phone number submitted by the user.
		 * @param string $otp_type      email or sms verification.
		 * @param string $password      password submitted by the user.
		 * @param array  $extra_data    an array containing all the extra data submitted by the user.
		 * @param bool   $from_both     denotes if user has a choice between email and phone verification.
		 * @param string $form_session_var the form session variable.
		 */
		public function challenge(
			$user_login,
			$user_email,
			$errors,
			$phone_number = null,
			$otp_type = 'email',
			$password = '',
			$extra_data = null,
			$from_both = false,
			$form_session_var = null
		) {

			$phone_number       = MoUtility::process_phone_number( $phone_number );
			$user_email         = $user_email ? $user_email : '';
			$user_login         = sanitize_user( $user_login, true );
			$encrypted_password = MoUtility::encrypt_password( $password );
			if ( empty( MoPHPSessions::get_session_var( 'user_password' ) ) ) {
				MoPHPSessions::add_session_var( 'user_password', $encrypted_password );
			}

			MoPHPSessions::add_session_var( 'current_url', MoUtility::current_page_url() );
			MoPHPSessions::add_session_var( 'user_email', $user_email );
			MoPHPSessions::add_session_var( 'user_login', $user_login );
			MoPHPSessions::add_session_var( 'phone_number_mo', $phone_number );
			$extra_data = is_array( $extra_data ) ? MoUtility::mo_sanitize_array( $extra_data ) : array();
			MoPHPSessions::add_session_var( 'extra_data', $extra_data );
			if ( ! is_null( $form_session_var ) ) {
				MoPHPSessions::add_session_var( 'form_session_var', $form_session_var );
			}
			$this->handleOTPAction( $user_login, $user_email, $phone_number, $otp_type, $from_both, $extra_data );
		}


		/**
		 * This function is called to handle the resend OTP Verification process.
		 *
		 * @param string $otp_type  email or sms verification.
		 * @param string $from_both denotes if user has a choice between email and phone verification.
		 */
		private function handleResendOTP( $otp_type, $from_both ) {

			$user_email       = MoPHPSessions::get_session_var( 'user_email' );
			$user_login       = sanitize_user( MoPHPSessions::get_session_var( 'user_login' ), true );
			$phone_number     = MoUtility::process_phone_number( MoPHPSessions::get_session_var( 'phone_number_mo' ) );
			$extra_data       = MoPHPSessions::get_session_var( 'extra_data' );
			$form_session_var = MoPHPSessions::get_session_var( 'form_session_var' );
			do_action( 'mo_generate_otp', $user_login, $user_email, null, $phone_number, $otp_type, null, $extra_data, $from_both, $form_session_var );
			$this->handleOTPAction( $user_login, $user_email, $phone_number, $otp_type, $from_both, $extra_data );
		}

		/**
		 * This function starts the email or sms verification depending on the otp type.
		 *
		 * @param string $user_login    username submitted by the user.
		 * @param string $user_email    email submitted by the user.
		 * @param string $phone_number  phone number submitted by the user.
		 * @param string $otp_type      email or sms verification.
		 * @param string $from_both     denotes if user has a choice between email and phone verification.
		 * @param array  $extra_data    an array containing all the extra data submitted by the user.
		 */
		private function handleOTPAction( $user_login, $user_email, $phone_number, $otp_type, $from_both, $extra_data ) {
			$user_login   = sanitize_user( $user_login, true );
			$phone_number = MoUtility::process_phone_number( $phone_number );
			if ( MoPHPSessions::get_session_var( 'mo_blocked_time' ) && time() - MoPHPSessions::get_session_var( 'mo_blocked_time' ) < get_mo_option( 'otp_timer', 'mo_rc_sms_' ) * 60 ) {
				apply_filters( 'mo_add_script', '' );
			}
			if ( class_exists( 'OTP\Addons\resendcontrol\Handler\ResendControlHandler', false ) && get_mo_option( 'otp_timer_enable', 'mo_rc_sms_' ) ) {
				$this->check_if_user_is_blocked( $user_login, $otp_type );
			}
			global $phone_logic, $email_logic;
			switch ( $otp_type ) {
				case VerificationType::PHONE:
					$phone_logic->handle_logic( $user_login, $user_email, $phone_number, $otp_type, $from_both );
					break;
				case VerificationType::EMAIL:
					$email_logic->handle_logic( $user_login, $user_email, $phone_number, $otp_type, $from_both );
					break;
				case VerificationType::BOTH:
					miniorange_verification_user_choice(
						$user_login,
						$user_email,
						$phone_number,
						MoMessages::showMessage( MoMessages::CHOOSE_METHOD ),
						$otp_type
					);
					break;
				case VerificationType::EXTERNAL:
					$curl_url = isset( $extra_data['curl'] ) ? esc_url_raw( $extra_data['curl'] ) : '';
					$curl_msg = isset( $extra_data['message'] ) ? sanitize_text_field( $extra_data['message'] ) : '';
					mo_external_phone_validation_form(
						$curl_url,
						$user_email,
						$curl_msg,
					);
					break;
			}
		}


		/**
		 * This function handles which page to redirect the user to when he
		 * clicks on the go back link on the OTP Verification pop up.
		 */
		private function handleGoBackAction() {

			$redirect_url = MoPHPSessions::get_session_var( 'current_url' );
			do_action( 'unset_session_variable' );
			// Validate redirect URL is internal before redirecting.
			if ( ! $redirect_url || ! wp_validate_redirect( $redirect_url, home_url() ) ) {
				$redirect_url = home_url();
			}
			wp_safe_redirect( $redirect_url );
			exit;
		}

		/**
		 * This function handles if the user is blocked.
		 *
		 * @param string $user_login username submitted by the user.
		 * @param string $otp_type   email or sms verification.
		 */
		private function check_if_user_is_blocked( $user_login, $otp_type ) {

			$is_ajax_form       = apply_filters( 'is_ajax_form', false );
			$initial_block_time = (int) MoPHPSessions::get_session_var( 'MO_OTP_BLOCKED_TIME' );

			if ( ! $is_ajax_form && ! $initial_block_time ) {
				MoPHPSessions::add_session_var( 'MO_OTP_BLOCKED_TIME', time() - 1 );
			}
			$block_time        = (int) MoPHPSessions::get_session_var( 'MO_OTP_BLOCKED_TIME' );
			$cooldown_duration = get_mo_option( 'otp_timer', 'mo_rc_sms_' ) * 60;
			$current_time      = ! $is_ajax_form ? time() - 1 : time();
			$remaining_time    = max( 0, $cooldown_duration - ( $current_time - $block_time ) );

			if ( $remaining_time <= 0 || $current_time === $block_time ) {
				MoPHPSessions::unset_session( 'MO_OTP_BLOCKED_TIME' );
				return;
			}

			$formatted_time = gmdate( 'i:s', $remaining_time );
			$message        = MoMessages::showMessage( MoMessages::USER_IS_BLOCKED, array( 'remaining_time' => $formatted_time ) );
			$resend_handler = 'OTP\Addons\resendcontrol\Handler\ResendControlHandler';
			if ( ( $is_ajax_form || 'ajax_phone' === $user_login ) && 'external' !== $otp_type ) {
				if ( class_exists( $resend_handler, false ) ) {
					$message .= $resend_handler::mo_get_resend_timer_script( 'ajax_form', '', $remaining_time );
				}
				wp_send_json( MoUtility::create_json( $message, MoConstants::ERROR_JSON_TYPE ) );
			} else {
				if ( class_exists( $resend_handler, false ) ) {
					$resend_handler::mo_get_timer_script( 'pop-up', '' );
				}
				miniorange_site_otp_validation_form( null, null, null, MoMessages::showMessage( MoMessages::USER_IS_BLOCKED, array( 'remaining_time' => $formatted_time ) ), null, null );
			}
		}


		/**
		 * This function is called from each form class to validate the otp entered by the
		 * user.
		 *
		 * @param string $otp_type OTPType for which validation needs to be done.
		 * @param string $request_var otp token key.
		 * @param string $otp otp token submitted.
		 * @return void
		 */
		public function validateOTP( $otp_type, $request_var, $otp ) {
			$user_login       = sanitize_user( MoPHPSessions::get_session_var( 'user_login' ), true );
			$user_email       = MoPHPSessions::get_session_var( 'user_email' );
			$phone_number     = MoUtility::process_phone_number( MoPHPSessions::get_session_var( 'phone_number_mo' ) );
			$password         = MoPHPSessions::get_session_var( 'user_password' );
			$extra_data       = MoPHPSessions::get_session_var( 'extra_data' );
			$form_session_var = MoPHPSessions::get_session_var( 'form_session_var' );
			$is_ajax_form     = apply_filters( 'is_ajax_form', false );

			if ( ! $is_ajax_form ) {
				$this->mo_check_integrity( $user_login, $user_email, $password, $phone_number, $otp_type, $form_session_var );
			}
			$token = null;
			if ( ( isset( $_REQUEST['mopopup_wpnonce'] ) && ( wp_verify_nonce( sanitize_key( wp_unslash( $_REQUEST['mopopup_wpnonce'] ) ), 'mo_popup_options' ) ) ) ) {
				// Sanitize only the specific request var instead of the entire $_REQUEST superglobal.
				$token = MoUtility::sanitize_check( $request_var, $_REQUEST );
			}
			$token = empty( $token ) ? $otp : $token;
			$tx_id = SessionUtils::get_transaction_id( $otp_type );
			$tx_id = esc_attr( $tx_id );
			if ( ! empty( $tx_id ) ) {
				$gateway           = GatewayFunctions::instance();
				$content           = $gateway->mo_validate_otp_token( $tx_id, $token, $otp_type );
				$validation_status = 'SUCCESS' === $content['status'] ? 'OTP_VERIFIED' : 'VERIFICATION_FAILED';
				apply_filters( 'mo_update_reporting', $tx_id, $validation_status );
				switch ( $content['status'] ) {
					case 'SUCCESS':
						$this->onValidationSuccess( $user_login, $user_email, $password, $phone_number, $extra_data, $otp_type );
						break;
					default:
						$this->onValidationFailed( $user_login, $user_email, $phone_number, $otp_type );
						break;
				}
			}
		}

		/**
		 * Validates that the verified phone number or email matches the expected value from session.
		 *
		 * @param string $user_login         Username of the user.
		 * @param string $user_email         Email address submitted in the form.
		 * @param string $password           Password submitted (unused here).
		 * @param string $phone_number       Phone number submitted in the form.
		 * @param string $otp_type           Type of OTP verification ('phone' or 'email').
		 * @param string $form_session_var   Session variable key used for tracking verification.
		 */
		private function mo_check_integrity( $user_login, $user_email, $password, $phone_number, $otp_type, $form_session_var ) {
			$mo_email_phone_values_for_mismatch_check = apply_filters( 'mo_otp_verification_mismatch_for_popup_forms', array() );
			if ( empty( $mo_email_phone_values_for_mismatch_check ) || ! is_array( $mo_email_phone_values_for_mismatch_check ) ) {
				return;
			}

			if ( VerificationType::PHONE === $otp_type ) {
				// Safely access the 'phone' key only if it exists.
				if ( ! isset( $mo_email_phone_values_for_mismatch_check['phone'] ) ) {
					return;
				}
				$phone = $mo_email_phone_values_for_mismatch_check['phone'];
				if ( empty( trim( (string) $phone ) ) ) {
					return;
				}

				if ( ! SessionUtils::is_phone_verified_match( $form_session_var, $phone ) ) {
					miniorange_site_otp_validation_form(
						null,
						$user_email,
						$phone_number,
						MoMessages::showMessage( MoMessages::PHONE_MISMATCH ),
						$otp_type,
						false
					);
				}
			} elseif ( VerificationType::EMAIL === $otp_type ) {
				// Safely access the 'email' key only if it exists.
				if ( ! isset( $mo_email_phone_values_for_mismatch_check['email'] ) ) {
					return;
				}
				$email = $mo_email_phone_values_for_mismatch_check['email'];
				if ( empty( trim( (string) $email ) ) ) {
					return;
				}

				if ( ! SessionUtils::is_email_verified_match( $form_session_var, $email ) ) {
					miniorange_site_otp_validation_form(
						null,
						$user_email,
						$phone_number,
						MoMessages::showMessage( MoMessages::EMAIL_MISMATCH ),
						$otp_type,
						false
					);
				}
			}
		}

		/**
		 * This function is called to handle what needs to be done if OTP
		 * entered by the user is validated successfully. Calls an action
		 * which could be hooked into to process this elsewhere. Check each
		 * handle_post_verification of each form handler.
		 *
		 * @param string $user_login username submitted by the user.
		 * @param string $user_email email submitted by the user.
		 * @param string $password password submitted by the user.
		 * @param string $phone_number phone number submitted by the user.
		 * @param string $extra_data an array containing all the extra data submitted by the user.
		 * @param string $otp_type The VerificationType.
		 */
		private function onValidationSuccess( $user_login, $user_email, $password, $phone_number, $extra_data, $otp_type ) {
			$redirect_to = MoPHPSessions::get_session_var( 'redirect_to' );
			$redirect_to = ! empty( $redirect_to ) ? esc_url_raw( $redirect_to ) : '';
			$password    = MoUtility::decrypt_password( $password );
			do_action( 'otp_verification_successful', $redirect_to, $user_login, $user_email, $password, $phone_number, $extra_data, $otp_type );
		}


		/**
		 * This function is called to handle what needs to be done if OTP
		 * entered by the user is not a valid OTP and fails the verification.
		 * Calls an action which could be hooked into to process this elsewhere.
		 * Check each handle_post_verification of each form handler.
		 *
		 * @param string $user_login username submitted by the user.
		 * @param string $user_email email submitted by the user.
		 * @param string $phone_number phone number submitted by the user string.
		 * @param string $otp_type The VerificationType.
		 */
		private function onValidationFailed( $user_login, $user_email, $phone_number, $otp_type ) {
			do_action( 'otp_verification_failed', $user_login, $user_email, $phone_number, $otp_type );
		}


		/**
		 * This function starts the OTP verification process based on user input.
		 * starts Email or Phone Verification based on user input.
		 *
		 * @param String $post_data  the data posted.
		 */
		private function handleOTPChoice( $post_data ) {

			$user_login   = MoPHPSessions::get_session_var( 'user_login' );
			$user_email   = MoPHPSessions::get_session_var( 'user_email' );
			$user_phone   = MoPHPSessions::get_session_var( 'phone_number_mo' );
			$user_pass    = MoPHPSessions::get_session_var( 'user_password' );
			$extra_data   = MoPHPSessions::get_session_var( 'extra_data' );
			$form_session = MoPHPSessions::get_session_var( 'form_session_var' );

			$otp_choice   = isset( $post_data['mo_customer_validation_otp_choice'] ) ? sanitize_text_field( $post_data['mo_customer_validation_otp_choice'] ) : '';
			$otp_ver_type = strcasecmp( $otp_choice, 'user_email_verification' ) === 0
			? VerificationType::EMAIL : VerificationType::PHONE;

			$this->challenge( $user_login, $user_email, null, $user_phone, $otp_ver_type, $user_pass, $extra_data, true );
		}


		/**
		 * This function filters the phone number before making any api calls.
		 * This is mostly used in the on-prem plugin to filter the phone number
		 * before the api call is made to send OTPs.
		 *
		 * @param String $phone the phone number to be processed.
		 * @return String
		 */
		public function filterPhone( $phone ) {
			return str_replace( '+', '', $phone );
		}


		/**
		 * This function hooks into the init WordPress hook. This function processes the
		 * form post data and calls the correct function to process the posted data.
		 * This mostly handles all the plugin related functionality.
		 */
		public function handle_formActions() {

			if ( ( ! isset( $_POST['mopopup_wpnonce'] ) || ( ! wp_verify_nonce( sanitize_key( wp_unslash( $_POST['mopopup_wpnonce'] ) ), 'mo_popup_options' ) ) ) ) {
				return;
			}
			$option      = isset( $_POST['option'] ) ? sanitize_text_field( wp_unslash( $_POST['option'] ) ) : '';
			$from_both   = MoUtility::sanitize_check( 'from_both', $_POST );
			$otp_type    = MoUtility::sanitize_check( 'otp_type', $_POST );
			$data        = MoUtility::mo_sanitize_array( $_POST );
			$redirect_to = MoUtility::sanitize_check( 'redirect_to', $_POST );
			if ( ! empty( $redirect_to ) ) {
				$redirect_to = esc_url_raw( wp_unslash( $redirect_to ) );
				MoPHPSessions::add_session_var( 'redirect_to', $redirect_to );
			}

			switch ( $option ) {
				case 'validation_goBack':
					$this->handleGoBackAction();
					break;
				case 'miniorange-validate-otp-form':
					$this->validateOTP( $otp_type, 'mo_otp_token', null );
					break;
				case 'verification_resend_otp':
					$this->handleResendOTP( $otp_type, $from_both );
					break;
				case 'miniorange-validate-otp-choice-form':
					$this->handleOTPChoice( $data );
					break;
				default:
					miniorange_site_otp_validation_form(
						'null',
						'null',
						'null',
						MoMessages::showMessage( MoMessages::INVALID_OP ),
						$otp_type,
						$from_both
					);
					break;
			}
		}
	}
}
