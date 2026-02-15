<?php
/**
 * Common handler to handle the email logic during phone verification.
 *
 * @package miniorange-otp-verification/handler
 */

namespace OTP\Handler;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
use OTP\Helper\GatewayFunctions;
use OTP\Helper\MoConstants;
use OTP\Helper\MoMessages;
use OTP\Helper\MoUtility;
use OTP\Helper\SessionUtils;
use OTP\Objects\VerificationLogic;
use OTP\Traits\Instance;
use OTP\Helper\MoPHPSessions;

/**
 * This class handles all the email related logic for OTP Verification
 * Process the email address and starts the Email verification process.
 */
if ( ! class_exists( 'EmailVerificationLogic' ) ) {
	/**
	 * EmailVerificationLogic class
	 */
	final class EmailVerificationLogic extends VerificationLogic {

		use Instance;

		/**
		 * This function is called to handle Email Verification request. Processes
		 * the request and starts the OTP Verification process.
		 *
		 * @param string $user_login    Username of the user.
		 * @param string $user_email    Email of the user.
		 * @param string $phone_number  Phone number of the user.
		 * @param string $otp_type      Email or SMS verification.
		 * @param string $from_both     Whether user enabled from both.
		 */
		public function handle_logic( $user_login, $user_email, $phone_number, $otp_type, $from_both ) {
			$this->checkIfUserRegistered( $otp_type, $from_both );
			$mle                     = MoUtility::mllc();
			$license_expired_message = MoMessages::showMessage( MoMessages::ERROR_OTP_EMAIL );
			if ( $mle['STATUS'] ) {
				if ( $this->is_ajax_form() ) {
					wp_send_json( MoUtility::create_json( $license_expired_message, MoConstants::ERROR_JSON_TYPE ) );
				} else {
					miniorange_site_otp_validation_form( null, null, null, $license_expired_message, $otp_type, $from_both );
				}
			}
			$sanitized_user_email = sanitize_email( $user_email );
			if ( is_email( $sanitized_user_email ) && ! empty( $sanitized_user_email ) ) {
				$this->handle_matched( $user_login, $sanitized_user_email, $phone_number, $otp_type, $from_both );
			} else {
				$this->handle_not_matched( $user_email, $otp_type, $from_both );
			}
		}


		/**
		 * Function checks if the user is registered with miniorange and shows the error message if not registered.
		 *
		 * @param string $otp_type  email or sms verification.
		 * @param string $from_both has user enabled from both.
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
		 * This function starts the OTP Verification process if email address matches the
		 * correct format and is not blocked by the admin.
		 *
		 * @param string $user_login    Username of the user.
		 * @param string $user_email    Email of the user.
		 * @param string $phone_number  Phone number of the user.
		 * @param string $otp_type      Email or SMS verification.
		 * @param string $from_both     Whether user enabled from both option.
		 */
		public function handle_matched( $user_login, $user_email, $phone_number, $otp_type, $from_both ) {
			$escaped_email = esc_html( $user_email );
			$message       = str_replace( '##email##', $escaped_email, $this->get_is_blocked_message() );
			if ( $this->is_blocked( $user_email, $phone_number ) ) {
				if ( $this->is_ajax_form() ) {
					wp_send_json( MoUtility::create_json( $message, MoConstants::ERROR_JSON_TYPE ) );
				} else {
					miniorange_site_otp_validation_form( null, null, null, $message, $otp_type, $from_both );
				}
			} else {
				if ( ! $this->is_ajax_form() ) {
					$form_session_var = MoPHPSessions::get_session_var( 'form_session_var' );
					SessionUtils::add_email_verified( $form_session_var, $user_email );
				}
				$this->start_otp_verification( $user_login, $user_email, $phone_number, $otp_type, $from_both );
			}
		}


		/**
		 * This function handles what message needs to be shown to the user if email
		 * doesn't match the correct format. Check if admin has set any message, and
		 * check if the form is an ajax form to show the message in the correct format.
		 *
		 * @param string $user_email    the email being processed.
		 * @param string $otp_type      email or sms verification.
		 * @param string $from_both     has user enabled from both.
		 */
		public function handle_not_matched( $user_email, $otp_type, $from_both ) {
			$escaped_email = esc_html( $user_email );
			$message       = str_replace( '##email##', $escaped_email, $this->get_otp_invalid_format_message() );
			if ( $this->is_ajax_form() ) {
				wp_send_json( MoUtility::create_json( $message, MoConstants::ERROR_JSON_TYPE ) );
			} else {
				miniorange_site_otp_validation_form( null, null, null, $message, $otp_type, $from_both );
			}
		}


		/**
		 * This function is called to handle Email Verification request. Processes
		 * the request and starts the OTP Verification process to send OTP to user's
		 * email address.
		 *
		 * @param string $user_login    username of the user.
		 * @param string $user_email    email of the user.
		 * @param string $phone_number  phone number of the user.
		 * @param string $otp_type      email or sms verification.
		 * @param string $from_both     has user enabled from both.
		 */
		public function start_otp_verification( $user_login, $user_email, $phone_number, $otp_type, $from_both ) {
			do_action( 'mo_generate_or_resend_otp', $user_login, $user_email, $phone_number, $otp_type, $from_both );
			$gateway = GatewayFunctions::instance();
			$content = $gateway->mo_send_otp_token( 'EMAIL', $user_email, '' );
			if ( ! is_array( $content ) || ! isset( $content['status'] ) ) {
				$this->handle_otp_sent_failed( $user_login, $user_email, $phone_number, $otp_type, $from_both, array() );
				return;
			}
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
		 * This function is called to handle what needs to be done when OTP sending is successful.
		 * Checks if the current form is an AJAX form and decides what message has to be
		 * shown to the user.
		 *
		 * @param string $user_login    Username of the user.
		 * @param string $user_email    Email of the user.
		 * @param string $phone_number  Phone number of the user.
		 * @param string $otp_type      Email or SMS verification.
		 * @param string $from_both     Whether user enabled from both.
		 * @param array  $content       JSON decoded response from server.
		 */
		public function handle_otp_sent( $user_login, $user_email, $phone_number, $otp_type, $from_both, $content ) {
			$tx_id = isset( $content['txId'] ) ? sanitize_text_field( wp_unslash( $content['txId'] ) ) : '';
			if ( ! empty( $tx_id ) ) {
				SessionUtils::set_email_transaction_id( $tx_id );
			}
			$safe_email        = sanitize_email( $user_email );
			$masked_user_email = MoUtility::mo_mask_email( $safe_email );
			$message           = str_replace( '##email##', $masked_user_email, $this->get_otp_sent_message() );
			if ( ! empty( $tx_id ) ) {
				apply_filters( 'mo_start_reporting', $tx_id, $safe_email, $safe_email, $otp_type, $message, 'OTP_SENT' );
			}
			if ( $this->is_ajax_form() ) {
				wp_send_json( MoUtility::create_json( $message, MoConstants::SUCCESS_JSON_TYPE ) );
			} else {
				miniorange_site_otp_validation_form( $user_login, $safe_email, $phone_number, $message, $otp_type, $from_both );
			}
		}

		/**
		 * This function is called to handle what needs to be done when OTP sending fails.
		 * Checks if the current form is an AJAX form and decides what message has to be
		 * shown to the user.
		 *
		 * @param string $user_login    Username of the user.
		 * @param string $user_email    Email of the user.
		 * @param string $phone_number  Phone number of the user.
		 * @param string $otp_type      Email or SMS verification.
		 * @param string $from_both     Whether user enabled from both.
		 * @param array  $content       JSON decoded response from server.
		 */
		public function handle_otp_sent_failed( $user_login, $user_email, $phone_number, $otp_type, $from_both, $content ) {
			$message = str_replace( '##email##', $user_email, $this->get_otp_sent_failed_message() );

			if ( $this->is_ajax_form() ) {
				wp_send_json( MoUtility::create_json( $message, MoConstants::ERROR_JSON_TYPE ) );
			} else {
				miniorange_site_otp_validation_form( null, null, null, $message, $otp_type, $from_both );
			}
		}

		/**
		 * Get the success message to be shown to the user when OTP was sent
		 * successfully. If admin has set his own unique message then
		 * show that to the user instead of the default one.
		 */
		public function get_otp_sent_message() {
			$sent_msg = get_mo_option( 'success_email_message', 'mo_otp_' );
			return $sent_msg ? $sent_msg : MoMessages::showMessage( MoMessages::OTP_SENT_EMAIL );
		}

		/**
		 * Get the error message to be shown to the user when there was an
		 * error sending OTP. If admin has set his own unique message then
		 * show that to the user instead of the default one.
		 */
		public function get_otp_sent_failed_message() {
			$failed_msg = get_mo_option( 'error_email_message', 'mo_otp_' );
			return $failed_msg ? $failed_msg : MoMessages::showMessage( MoMessages::ERROR_OTP_EMAIL );
		}

		/**
		 * This function checks if the email domain has been blocked by the admin.
		 *
		 * @param string $user_email    User email.
		 * @param string $phone_number  Phone number.
		 * @return bool
		 */
		public function is_blocked( $user_email, $phone_number ) {
			$blocked_domains_raw   = (string) get_mo_option( 'blocked_domains' );
			$blocked_email_domains = explode( ';', $blocked_domains_raw );
			$blocked_email_domains = array_filter(
				array_map(
					function ( $domain ) {
						$domain = is_string( $domain ) ? trim( strtolower( $domain ) ) : '';
						return $domain;
					},
					$blocked_email_domains,
				),
			);
			$blocked_email_domains = array_values( array_unique( $blocked_email_domains ) );
			$blocked_email_domains = apply_filters( 'mo_blocked_email_domains', $blocked_email_domains );
			if ( ! is_array( $blocked_email_domains ) ) {
				$blocked_email_domains = array();
			}
			$domain = strtolower( MoUtility::get_domain( sanitize_email( $user_email ) ) );
			return in_array( $domain, $blocked_email_domains, true );
		}

		/**
		 * Function decides what message needs to be shown to the user when he enters a
		 * blocked email domain. It checks if the admin has set any message in the
		 * plugin settings and returns that instead of the default one.
		 */
		public function get_is_blocked_message() {
			$blocked_emails = get_mo_option( 'blocked_email_message', 'mo_otp_' );
			return $blocked_emails ? $blocked_emails : MoMessages::showMessage( MoMessages::ERROR_EMAIL_BLOCKED );
		}

		/**
		 * Function decides what message needs to be sent to the user when the
		 * email does not match the required format. It checks if the admin
		 * has set any message in the plugin settings and returns that instead
		 * of the string default one.
		 */
		public function get_otp_invalid_format_message() {
			$message = get_mo_option( 'invalid_email_message', 'mo_otp_' );
			return $message ? $message : MoMessages::showMessage( MoMessages::ERROR_EMAIL_FORMAT );
		}
	}
}
