<?php
/**
 * Comman handler to handle the phone logic during phone verification.
 *
 * @package miniorange-otp-verification/handler
 */

namespace OTP\Handler;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
use OTP\Helper\FormSessionVars;
use OTP\Helper\GatewayFunctions;
use OTP\Helper\MoConstants;
use OTP\Helper\MoMessages;
use OTP\Helper\MoUtility;
use OTP\Helper\SessionUtils;
use OTP\Objects\FormSessionData;
use OTP\Objects\VerificationLogic;
use OTP\Traits\Instance;
use OTP\LicenseLibrary\Mo_License_Service;
use OTP\Helper\MoPHPSessions;

/**
 * This class handles all the phone related logic for OTP Verification
 * Process the phone number and starts the phone verification process.
 */
if ( ! class_exists( 'PhoneVerificationLogic' ) ) {
	/**
	 * PhoneVerificationLogic class
	 */
	final class PhoneVerificationLogic extends VerificationLogic {

		use Instance;

		/**
		 * This function is called to handle Email Verification request. Processes
		 * the request and starts the OTP Verification process. Starts of with
		 * checking if the phone number is in the requested format.
		 *
		 * @param string $user_login username of the user.
		 * @param string $user_email email of the user.
		 * @param string $phone_number phone number of the user.
		 * @param string $otp_type email or sms verification.
		 * @param string $from_both has user enabled from both.
		 */
		public function handle_logic( $user_login, $user_email, $phone_number, $otp_type, $from_both ) {
			$this->checkIfUserRegistered( $otp_type, $from_both );
			$phone_number            = MoUtility::process_phone_number( (string) $phone_number );
			$match                   = MoUtility::validate_phone_number( $phone_number );
			$is_country_block        = MoUtility::check_for_selected_country_addon( $phone_number );
			$message                 = MoMessages::showMessage( MoMessages::BLOCKED_COUNTRY );
			$mle                     = MoUtility::mllc();
			$license_expired_message = MoMessages::showMessage( MoMessages::ERROR_OTP_PHONE );
			if ( is_array( $mle ) && isset( $mle['STATUS'] ) && $mle['STATUS'] ) {
				if ( $this->is_ajax_form() ) {
					wp_send_json( MoUtility::create_json( $license_expired_message, MoConstants::ERROR_JSON_TYPE ) );
				} else {
					miniorange_site_otp_validation_form( null, null, null, $license_expired_message, $otp_type, $from_both );
				}
			}
			if ( $match && $is_country_block ) {
				if ( $this->is_ajax_form() ) {
					wp_send_json( MoUtility::create_json( $message, MoConstants::COUNTRY_BLOCKED_ERROR ) );
				} else {
					miniorange_site_otp_validation_form( null, null, null, $message, $otp_type, $from_both );
				}
			}
			switch ( $match ) {
				case 0:
					$this->handle_not_matched( $phone_number, $otp_type, $from_both );
					break;
				case 1:
					$this->handle_matched( $user_login, $user_email, $phone_number, $otp_type, $from_both );
					break;
			}
		}


		/**
		 * Checks if the user is registered with miniorange and show the error message if not registereed.
		 *
		 * @param array $otp_type .
		 * @param array $from_both .
		 * @return void
		 */
		private function checkIfUserRegistered( $otp_type, $from_both ) {
			if ( ! MoUtility::micr() ) {
				$message = MoMessages::showMessage( MoMessages::NEED_TO_REGISTER );
				if ( $this->is_ajax_form() ) {

					wp_send_json( MoUtility::create_json( $message, MoConstants::ERROR_JSON_TYPE ) );
				} else {
					miniorange_site_otp_validation_form( null, null, null, $message, $otp_type, $from_both );
				}
			}
		}


		/**
		 * This function starts the OTP Verification process if phone number matches the
		 * correct format and is not blocked by the admin.
		 *
		 * @param string $user_login username of the user.
		 * @param string $user_email email of the user.
		 * @param string $phone_number  phone number of the user.
		 * @param string $otp_type email or sms verification.
		 * @param string $from_both string has user enabled from both.
		 */
		public function handle_matched( $user_login, $user_email, $phone_number, $otp_type, $from_both ) {
			$phone_number  = MoUtility::process_phone_number( (string) $phone_number );
			$escaped_phone = esc_html( $phone_number );
			$message       = str_replace( '##phone##', $escaped_phone, $this->get_is_blocked_message() );
			if ( $this->is_blocked( $user_email, $phone_number ) ) {
				if ( $this->is_ajax_form() ) {
					wp_send_json( MoUtility::create_json( $message, MoConstants::ERROR_JSON_TYPE ) );
				} else {
					miniorange_site_otp_validation_form( null, null, null, $message, $otp_type, $from_both );
				}
			} else {
				do_action( 'mo_globally_banned_phone_check', $phone_number, $this->is_ajax_form(), $otp_type, $from_both );
				if ( ! $this->is_ajax_form() ) {
					$form_session_var = MoPHPSessions::get_session_var( 'form_session_var' );
					SessionUtils::add_phone_verified( $form_session_var, $phone_number );
				}
				$this->start_otp_verification( $user_login, $user_email, $phone_number, $otp_type, $from_both );
			}
		}


		/**
		 * This function starts the OTP Verification process and contacts server to send OTP to the
		 * user's phone number.
		 *
		 * @param string $user_login    username of the user.
		 * @param string $user_email email of the user.
		 * @param string $phone_number  phone number of the user.
		 * @param string $otp_type email or sms verification.
		 * @param string $from_both string has user enabled from both.
		 */
		public function start_otp_verification( $user_login, $user_email, $phone_number, $otp_type, $from_both ) {
			do_action( 'mo_generate_or_resend_otp', $user_login, $user_email, $phone_number, $otp_type, $from_both );
			$gateway           = GatewayFunctions::instance();
			$verification_type = 'SMS';
			if ( ! $gateway->is_mg() && ! get_mo_option( 'custome_gateway_type' ) ) {
				$this->handle_otp_sent_failed( $user_login, $user_email, $phone_number, $otp_type, $from_both, array() );
				return;
			}

			$content = $gateway->mo_send_otp_token( $verification_type, '', $phone_number );
			switch ( $content['status'] ) {
				case 'SUCCESS':
					$this->handle_otp_sent( $user_login, $user_email, $phone_number, $otp_type, $from_both, $content );
					break;
				default:
					$this->handle_otp_sent_failed( $user_login, $user_email, $phone_number, $otp_type, $from_both, $content );
					break;
			}
		}


		/**
		 * This function handles what message needs to be shown to the user if phone number
		 * doesn't match the correct format. Check if admin has set any message, and check
		 * if the form is an ajax form to show the message in the correct format.
		 *
		 * @param string $phone_number  the phone number being processed.
		 * @param string $otp_type      email or sms verification.
		 * @param string $from_both has user enabled from both.
		 */
		public function handle_not_matched( $phone_number, $otp_type, $from_both ) {
			$escaped_phone = esc_html( $phone_number );
			$message       = str_replace( '##phone##', $escaped_phone, $this->get_otp_invalid_format_message() );
			if ( $this->is_ajax_form() ) {
				wp_send_json( MoUtility::create_json( $message, MoConstants::ERROR_JSON_TYPE ) );
			} else {
				miniorange_site_otp_validation_form( null, null, null, $message, $otp_type, $from_both );
			}
		}


		/**
		 * This function is called to handle what needs to be done when OTP sending fails.
		 * Checks if the current form is an AJAX form and decides what message has to be
		 * shown to the user.
		 *
		 * @param string $user_login    username of the user.
		 * @param string $user_email email of the user.
		 * @param string $phone_number  phone number of the user.
		 * @param string $otp_type email or sms verification.
		 * @param string $from_both has user enabled from both.
		 * @param array  $content string the json decoded response from server.
		 */
		public function handle_otp_sent_failed( $user_login, $user_email, $phone_number, $otp_type, $from_both, $content ) {
			$escaped_phone = esc_html( $phone_number );
			$message       = str_replace( '##phone##', $escaped_phone, $this->get_otp_sent_failed_message() );

			if ( $this->is_ajax_form() ) {
				wp_send_json( MoUtility::create_json( $message, MoConstants::ERROR_JSON_TYPE ) );
			} else {
				miniorange_site_otp_validation_form( null, null, null, $message, $otp_type, $from_both );
			}
		}


		/**
		 * This function is called to handle what needs to be done when OTP sending is successful.
		 * Checks if the current form is an AJAX form and decides what message has to be
		 * shown to the user.
		 *
		 * @param string $user_login username of the user.
		 * @param string $user_email email of the user.
		 * @param string $phone_number phone number of the user.
		 * @param string $otp_type email or sms verification.
		 * @param string $from_both has user enabled from both.
		 * @param array  $content string the json decoded response from server.
		 */
		public function handle_otp_sent( $user_login, $user_email, $phone_number, $otp_type, $from_both, $content ) {
			$tx_id = isset( $content['txId'] ) ? sanitize_text_field( wp_unslash( $content['txId'] ) ) : '';
			if ( ! empty( $tx_id ) ) {
				SessionUtils::set_phone_transaction_id( $tx_id );
			}
			$masked_phone_number = MoUtility::mo_mask_phone_number( $phone_number );
			$message             = str_replace( '##phone##', $masked_phone_number, $this->get_otp_sent_message() );
			if ( ! empty( $tx_id ) ) {
				apply_filters( 'mo_start_reporting', $tx_id, $phone_number, $phone_number, $otp_type, $message, 'OTP_SENT' );
			}
			if ( $this->is_ajax_form() ) {
				wp_send_json( MoUtility::create_json( $message, MoConstants::SUCCESS_JSON_TYPE ) );
			} else {
				miniorange_site_otp_validation_form( $user_login, $user_email, $phone_number, $message, $otp_type, $from_both );
			}
		}


		/**
		 * Get the success message to be shown to the user when OTP was sent
		 * successfully. If admin has set his own unique message then
		 * show that to the user instead of the default one.
		 */
		public function get_otp_sent_message() {
			$send_msg = get_mo_option( 'success_phone_message', 'mo_otp_' );
			return $send_msg ? $send_msg : MoMessages::showMessage( MoMessages::OTP_SENT_PHONE );
		}


		/**
		 * Get the error message to be shown to the user when there was an
		 * error sending OTP. If admin has set his own unique message then
		 * show that to the user instead of the default one.
		 */
		public function get_otp_sent_failed_message() {
			$failed_msg = get_mo_option( 'error_phone_message', 'mo_otp_' );
			$failed_msg = $failed_msg ? $failed_msg : MoMessages::showMessage( MoMessages::ERROR_OTP_PHONE );

			$failed_msg = apply_filters( 'mo_get_otp_sent_failed_message', $failed_msg );

			return $failed_msg;
		}


		/**
		 * Function decides what message needs to be sent to the user when the
		 * phone number does not match the required format. It checks if the admin
		 * has set any message in the plugin settings and returns that instead of the
		 * default one.
		 */
		public function get_otp_invalid_format_message() {
			$invalid_msg = get_mo_option( 'invalid_phone_message', 'mo_otp_' );
			return $invalid_msg ? $invalid_msg : MoMessages::showMessage( MoMessages::ERROR_PHONE_FORMAT );
		}


		/**
		 * This function checks if the phone number has been blocked by the admin
		 *
		 * @param string $user_email email of the user.
		 * @param string $phone_number phone number of the user.
		 * @return bool
		 */
		public function is_blocked( $user_email, $phone_number ) {
			$blocked_phone_numbers = explode( ';', get_mo_option( 'blocked_phone_numbers' ) );
			$blocked_phone_numbers = apply_filters( 'mo_blocked_phones', $blocked_phone_numbers, $phone_number );
			return in_array( $phone_number, $blocked_phone_numbers, true );
		}


		/**
		 * Function decides what message needs to be shown to the user when he enters a
		 * blocked phone number. It checks if the admin has set any message in the
		 * plugin settings and returns that instead of the default one.
		 */
		public function get_is_blocked_message() {
			$blocked_msg = get_mo_option( 'blocked_phone_message', 'mo_otp_' );
			return $blocked_msg ? $blocked_msg : MoMessages::showMessage( MoMessages::ERROR_PHONE_BLOCKED );
		}
	}
}
