<?php
/**
 * OTP Spam AJAX Handler
 *
 * @package otpspampreventer/handler
 */

namespace OSP\Handler;

use OSP\Handler\MoOtpSpamStorage;
use OSP\Handler\MoOtpSpamPreventerHandler;
use OSP\Helper\MoPuzzleHelper;
use OSP\Helper\MoSecurityHelper;
use OSP\Helper\MoSessionHelper;
use OSP\Traits\Instance;
use OTP\Helper\MoMessages;
use OTP\Helper\MoPHPSessions;
use OTP\Helper\MoUtility;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

if ( ! class_exists( 'MoOtpSpamAjax' ) ) {
	/**
	 * Handles AJAX requests for spam prevention functionality.
	 */
	class MoOtpSpamAjax {

		use Instance;

		/**
		 * Storage instance
		 *
		 * @var MoOtpSpamStorage
		 */
		private $storage;

		/**
		 * Handler instance
		 *
		 * @var MoOtpSpamPreventerHandler
		 */
		private $handler;

		/**
		 * Constructor
		 */
		public function __construct() {
			$this->storage = MoOtpSpamStorage::instance();
			$this->handler = MoOtpSpamPreventerHandler::instance();

			add_action( 'wp_ajax_mo_osp_check_spam', array( $this, 'mosp_check_spam_ajax' ) );
			add_action( 'wp_ajax_nopriv_mo_osp_check_spam', array( $this, 'mosp_check_spam_ajax' ) );

			add_action( 'wp_ajax_mo_osp_log_attempt', array( $this, 'mosp_log_attempt_ajax' ) );
			add_action( 'wp_ajax_nopriv_mo_osp_log_attempt', array( $this, 'mosp_log_attempt_ajax' ) );

			add_action( 'wp_ajax_mo_osp_save_settings', array( $this, 'mosp_save_settings_ajax' ) );

			add_action( 'wp_ajax_mo_osp_check_puzzle', array( $this, 'mosp_check_puzzle_ajax' ) );
			add_action( 'wp_ajax_nopriv_mo_osp_check_puzzle', array( $this, 'mosp_check_puzzle_ajax' ) );
			add_action( 'wp_ajax_mo_osp_generate_puzzle', array( $this, 'mosp_generate_puzzle_ajax' ) );
			add_action( 'wp_ajax_nopriv_mo_osp_generate_puzzle', array( $this, 'mosp_generate_puzzle_ajax' ) );
			add_action( 'wp_ajax_mo_osp_verify_puzzle', array( $this, 'mosp_verify_puzzle_ajax' ) );
			add_action( 'wp_ajax_nopriv_mo_osp_verify_puzzle', array( $this, 'mosp_verify_puzzle_ajax' ) );

			add_action( 'wp_ajax_mo_osp_check_timer_status', array( $this, 'mosp_check_timer_status_ajax' ) );
			add_action( 'wp_ajax_nopriv_mo_osp_check_timer_status', array( $this, 'mosp_check_timer_status_ajax' ) );

			add_action( 'wp_ajax_mo_osp_check_puzzle_requirement', array( $this, 'mosp_check_puzzle_requirement_ajax' ) );
			add_action( 'wp_ajax_nopriv_mo_osp_check_puzzle_requirement', array( $this, 'mosp_check_puzzle_requirement_ajax' ) );

			add_action( 'wp_ajax_mo_osp_check_blocked', array( $this, 'mosp_check_blocked_ajax' ) );
			add_action( 'wp_ajax_nopriv_mo_osp_check_blocked', array( $this, 'mosp_check_blocked_ajax' ) );

			add_action( 'wp_ajax_mo_osp_unblock_user', array( $this, 'mosp_unblock_user_ajax' ) );
			add_action( 'wp_ajax_nopriv_mo_osp_unblock_user', array( $this, 'mosp_unblock_user_ajax' ) );
		}

		/**
		 * AJAX handler for checking spam before OTP send.
		 *
		 * @return void Sends JSON response.
		 */
		public function mosp_check_spam_ajax() {
			check_ajax_referer( 'mo_osp_nonce', 'security' );

			$email      = isset( $_POST['email'] ) ? sanitize_email( wp_unslash( $_POST['email'] ) ) : '';
			$phone      = isset( $_POST['phone'] ) ? sanitize_text_field( wp_unslash( $_POST['phone'] ) ) : '';
			$browser_id = isset( $_POST['browser_id'] ) ? sanitize_text_field( wp_unslash( $_POST['browser_id'] ) ) : '';

			if ( empty( $email ) && empty( $phone ) ) {
				wp_send_json_error(
					array( 'message' => __( 'Phone or email is required', 'miniorange-otp-verification' ) ),
					400
				);
			}

			if ( $browser_id ) {
				$_POST['mo_osp_browser_id'] = $browser_id;
			}

			$result = $this->handler->mosp_check_spam_before_otp_send( true, '', $email, $phone );

			if ( is_wp_error( $result ) ) {
				wp_send_json_error(
					array(
						'message' => $result->get_error_message(),
						'code'    => $result->get_error_code(),
					),
					429
				);
			}

			wp_send_json_success(
				array( 'message' => __( 'Request allowed', 'miniorange-otp-verification' ) )
			);
		}

		/**
		 * AJAX handler for logging OTP attempts (for checkout mode)
		 *
		 * @return void Sends JSON response.
		 */
		public function mosp_log_attempt_ajax() {
			check_ajax_referer( 'mo_osp_nonce', 'security' );

			$browser_id = isset( $_POST['browser_id'] ) ? sanitize_text_field( wp_unslash( $_POST['browser_id'] ) ) : '';
			$mode       = isset( $_POST['mode'] ) ? sanitize_text_field( wp_unslash( $_POST['mode'] ) ) : '';

			if ( empty( $browser_id ) ) {
				wp_send_json_error(
					array( 'message' => __( 'Browser ID is required', 'miniorange-otp-verification' ) ),
					400
				);
			}

			$_POST['mo_osp_browser_id'] = $browser_id;

			$this->handler->mosp_record_otp_attempt( '', '', '' );

			wp_send_json_success(
				array( 'message' => __( 'Attempt logged', 'miniorange-otp-verification' ) )
			);
		}

		/**
		 * AJAX handler for saving settings (admin only).
		 *
		 * @return void Sends JSON response.
		 */
		public function mosp_save_settings_ajax() {
			check_ajax_referer( 'mo_osp_admin_nonce', 'security' );

			if ( ! current_user_can( 'manage_options' ) ) {
				wp_send_json_error(
					array( 'message' => __( 'Insufficient permissions', 'miniorange-otp-verification' ) ),
					403
				);
			}

			$settings = array();

			$settings['enabled']       = true;
			$settings['cooldown_time'] = isset( $_POST['cooldown_time'] ) ? absint( $_POST['cooldown_time'] ) : 60;

			$max_attempts             = isset( $_POST['max_attempts'] ) ? absint( $_POST['max_attempts'] ) : 3;
			$settings['max_attempts'] = max( 1, min( 10, $max_attempts ) );

			$settings['block_time'] = isset( $_POST['block_time'] ) ? absint( $_POST['block_time'] ) : 3600;

			$settings['daily_limit']  = isset( $_POST['daily_limit'] ) ? absint( $_POST['daily_limit'] ) : 10;
			$settings['hourly_limit'] = isset( $_POST['hourly_limit'] ) ? absint( $_POST['hourly_limit'] ) : 5;

			$settings['track_phone']   = true;
			$settings['track_email']   = true;
			$settings['track_ip']      = true;
			$settings['track_browser'] = true;

			$whitelist_ips             = isset( $_POST['whitelist_ips'] ) ? sanitize_textarea_field( wp_unslash( $_POST['whitelist_ips'] ) ) : '';
			$settings['whitelist_ips'] = array_filter( array_map( 'trim', explode( "\n", $whitelist_ips ) ) );
			$settings['whitelist_ips'] = array_values( $settings['whitelist_ips'] );

			$validation_errors = $this->mosp_validate_settings( $settings );
			if ( ! empty( $validation_errors ) ) {
				wp_send_json_error(
					array(
						'message' => __( 'Invalid settings', 'miniorange-otp-verification' ),
						'errors'  => $validation_errors,
					),
					400
				);
			}

			$result = $this->storage->mosp_update_settings( $settings );

			if ( $result ) {
				wp_send_json_success(
					array( 'message' => __( 'Settings saved successfully', 'miniorange-otp-verification' ) )
				);
			} else {
				wp_send_json_error(
					array( 'message' => __( 'Failed to save settings', 'miniorange-otp-verification' ) ),
					500
				);
			}
		}

		/**
		 * Validate settings array
		 *
		 * @param array $settings Settings to validate.
		 * @return array Validation errors
		 */
		private function mosp_validate_settings( $settings ) {
			$errors = array();

			if ( $settings['cooldown_time'] < 0 || $settings['cooldown_time'] > 86400 ) {
				$errors['cooldown_time'] = __( 'Cooldown time must be between 0 and 86400 seconds', 'miniorange-otp-verification' );
			}

			if ( $settings['max_attempts'] < 1 || $settings['max_attempts'] > 10 ) {
				$errors['max_attempts'] = __( 'Max attempts must be between 1 and 10', 'miniorange-otp-verification' );
			}

			if ( $settings['block_time'] < 60 || $settings['block_time'] > 604800 ) {
				$errors['block_time'] = __( 'Block time must be between 60 and 604800 seconds', 'miniorange-otp-verification' );
			}
			if ( $settings['daily_limit'] < 1 || $settings['daily_limit'] > 1000 ) {
				$errors['daily_limit'] = __( 'Daily limit must be between 1 and 1000', 'miniorange-otp-verification' );
			}

			if ( $settings['hourly_limit'] < 1 || $settings['hourly_limit'] > 100 ) {
				$errors['hourly_limit'] = __( 'Hourly limit must be between 1 and 100', 'miniorange-otp-verification' );
			}

			if ( $settings['hourly_limit'] <= $settings['max_attempts'] ) {
				$errors['hourly_limit'] = sprintf(
					/* translators: %d: max attempts value */
					__( 'Hourly limit must be greater than max attempts per window (%d)', 'miniorange-otp-verification' ),
					$settings['max_attempts']
				);
			}

			if ( $settings['daily_limit'] <= $settings['hourly_limit'] ) {
				$errors['daily_limit'] = sprintf(
					/* translators: %d: hourly limit value */
					__( 'Daily limit must be greater than hourly limit (%d)', 'miniorange-otp-verification' ),
					$settings['hourly_limit']
				);
			}

			if ( ! $settings['track_phone'] && ! $settings['track_email'] && ! $settings['track_ip'] && ! $settings['track_browser'] ) {
				$errors['tracking'] = __( 'At least one tracking method must be enabled', 'miniorange-otp-verification' );
			}

			foreach ( $settings['whitelist_ips'] as $ip ) {
				if ( ! filter_var( $ip, FILTER_VALIDATE_IP ) ) {
					$errors['whitelist_ips'] = sprintf(
						/* translators: %s: invalid IP address */
						__( 'Invalid IP address: %s', 'miniorange-otp-verification' ),
						$ip
					);
					break;
				}
			}
			return $errors;
		}

		/**
		 * SECURITY ENHANCEMENT: AJAX handler for generating secure puzzles
		 *
		 * This method generates a new puzzle and stores it securely in the session,
		 * preventing client-side manipulation of puzzle data.
		 *
		 * @return void Sends JSON response.
		 */
		public function mosp_generate_puzzle_ajax() {
			if ( ! wp_verify_nonce( sanitize_text_field( wp_unslash( $_POST['nonce'] ?? '' ) ), 'mo_osp_nonce' ) ) {
				wp_send_json_error( array( 'message' => __( 'Security check failed', 'miniorange-otp-verification' ) ) );
			}

			$puzzle = MoPuzzleHelper::mosp_generate_secure_puzzle();

			if ( ! $puzzle ) {
				wp_send_json_error( array( 'message' => __( 'Failed to generate puzzle', 'miniorange-otp-verification' ) ) );
			}

			MoPuzzleHelper::mosp_store_puzzle_in_session( $puzzle['question'], $puzzle['answer'] );

			$puzzle_image = MoPuzzleHelper::mosp_generate_puzzle_image( $puzzle['question'] );

			$response = array(
				'question' => $puzzle['question'],
				'message'  => __( 'Puzzle generated successfully', 'miniorange-otp-verification' ),
			);

			if ( $puzzle_image ) {
				$response['image'] = $puzzle_image;
			}

			wp_send_json_success( $response );
		}

		/**
		 * AJAX handler for checking if puzzle verification is required
		 *
		 * @return void Sends JSON response.
		 */
		public function mosp_check_puzzle_ajax() {
			if ( ! wp_verify_nonce( sanitize_text_field( wp_unslash( $_POST['nonce'] ?? '' ) ), 'mo_osp_nonce' ) ) {
				wp_send_json_error( array( 'message' => __( 'Security check failed', 'miniorange-otp-verification' ) ) );
			}

			$email      = sanitize_email( wp_unslash( $_POST['email'] ?? '' ) );
			$phone      = sanitize_text_field( wp_unslash( $_POST['phone'] ?? '' ) );
			$browser_id = sanitize_text_field( wp_unslash( $_POST['browser_id'] ?? '' ) );
			$ip         = $this->handler->mosp_get_client_ip();

			if ( ! empty( $phone ) ) {
				$phone       = MoUtility::process_phone_number( $phone );
				$digit_count = strlen( preg_replace( '/\D/', '', $phone ) );
				if ( $digit_count < 6 ) {
					$phone = '';
				}
			}

			if ( ! empty( $email ) ) {
				MoPHPSessions::add_session_var( 'user_email', $email );
			}
			if ( ! empty( $phone ) ) {
				MoPHPSessions::add_session_var( 'phone_number_mo', $phone );
			}
			$requires_puzzle = $this->handler->mosp_requires_puzzle_verification( $email, $phone, $ip, $browser_id );

			wp_send_json_success(
				array(
					'requires_puzzle' => $requires_puzzle,
					'message'         => $requires_puzzle ? __( 'Puzzle verification required', 'miniorange-otp-verification' ) : __( 'No puzzle required', 'miniorange-otp-verification' ),
				)
			);
		}

		/**
		 * AJAX handler for verifying puzzle completion
		 * SECURITY ENHANCEMENT: Uses session-stored puzzle data for validation
		 *
		 * @return void Sends JSON response.
		 */
		public function mosp_verify_puzzle_ajax() {
			if ( ! wp_verify_nonce( sanitize_text_field( wp_unslash( $_POST['nonce'] ?? '' ) ), 'mo_osp_nonce' ) ) {
				wp_send_json_error( array( 'message' => __( 'Security check failed', 'miniorange-otp-verification' ) ) );
			}

			$email      = sanitize_email( wp_unslash( $_POST['email'] ?? '' ) );
			$phone      = sanitize_text_field( wp_unslash( $_POST['phone'] ?? '' ) );
			$browser_id = sanitize_text_field( wp_unslash( $_POST['browser_id'] ?? '' ) );
			$ip         = $this->handler->mosp_get_client_ip();

			if ( ! empty( $phone ) ) {
				$phone       = MoUtility::process_phone_number( $phone );
				$digit_count = strlen( preg_replace( '/\D/', '', $phone ) );
				if ( $digit_count < 6 ) {
					$phone = '';
				}
			}
			if ( empty( $email ) ) {
				$email = MoPHPSessions::get_session_var( 'user_email' );
			}
			$session_phone = MoPHPSessions::get_session_var( 'phone_number_mo' );
			if ( empty( $phone ) && ! empty( $session_phone ) ) {
				$phone = $session_phone;
			}
			if ( ! empty( $phone ) ) {
				$phone       = MoUtility::process_phone_number( $phone );
				$digit_count = strlen( preg_replace( '/\D/', '', $phone ) );
				if ( $digit_count < 6 ) {
					$phone = '';
				}
			}
			if ( ! empty( $session_phone ) ) {
				$normalized_session_phone = MoUtility::process_phone_number( $session_phone );
				$session_digits           = strlen( preg_replace( '/\D/', '', $normalized_session_phone ) );
				if ( $session_digits >= 6 ) {
					$phone = $normalized_session_phone;
				}
			}

			$has_answer    = array_key_exists( 'puzzle_answer', $_POST );
			$puzzle_answer = $has_answer ? intval( wp_unslash( $_POST['puzzle_answer'] ) ) : null;

			if ( ! $has_answer ) {
				wp_send_json_error( array( 'message' => __( 'Puzzle answer is required', 'miniorange-otp-verification' ) ) );
			}

			if ( ! MoPuzzleHelper::mosp_has_puzzle_in_session() ) {
				wp_send_json_error( array( 'message' => __( 'Puzzle session expired. Please refresh and try again.', 'miniorange-otp-verification' ) ) );
			}

			$is_valid = MoPuzzleHelper::mosp_validate_puzzle_answer_from_session( $puzzle_answer );

			if ( ! $is_valid ) {
				$puzzle_attempts_key = 'mo_osp_puzzle_attempts_' . md5( $ip . MoSecurityHelper::mosp_get_user_agent() );
				$incorrect_attempts  = MoPHPSessions::get_session_var( $puzzle_attempts_key );

				if ( false === $incorrect_attempts ) {
					$incorrect_attempts = 0;
				}

				++$incorrect_attempts;

				$max_attempts_per_puzzle = 2;

				if ( $incorrect_attempts >= $max_attempts_per_puzzle ) {
					MoPHPSessions::unset_session( $puzzle_attempts_key );

					$new_puzzle = MoPuzzleHelper::mosp_generate_secure_puzzle();
					MoPuzzleHelper::mosp_store_puzzle_in_session(
						$new_puzzle['question'],
						$new_puzzle['answer'],
						$ip,
						MoSecurityHelper::mosp_get_user_agent()
					);

					$puzzle_image = MoPuzzleHelper::mosp_generate_puzzle_image( $new_puzzle['question'] );

					$response_data = array(
						'message'      => __( 'Incorrect puzzle answer. A new puzzle has been generated. Please solve it.', 'miniorange-otp-verification' ),
						'puzzle_reset' => true,
					);

					if ( $puzzle_image ) {
						$response_data['puzzle_image'] = $puzzle_image;
					} else {
						$response_data['puzzle_question'] = $new_puzzle['question'];
					}

					wp_send_json_error( $response_data );
				} else {
					MoPHPSessions::add_session_var( $puzzle_attempts_key, $incorrect_attempts );
					$remaining_attempts = $max_attempts_per_puzzle - $incorrect_attempts;

					wp_send_json_error(
						array(
							'message'            => sprintf(
								/* translators: %d: number of remaining attempts */
								__( 'Incorrect answer. Please try again. (%d attempt(s) remaining)', 'miniorange-otp-verification' ),
								$remaining_attempts
							),
							'puzzle_reset'       => false,
							'remaining_attempts' => $remaining_attempts,
						)
					);
				}
			} else {
				$puzzle_attempts_key = 'mo_osp_puzzle_attempts_' . md5( $ip . MoSecurityHelper::mosp_get_user_agent() );
				MoPHPSessions::unset_session( $puzzle_attempts_key );
			}

			$this->handler->mosp_reset_immediate_spam_protection( $email, $phone );
			$requires_limit_puzzle = $this->handler->mosp_requires_limit_puzzle_verification( $email, $phone );
			if ( $requires_limit_puzzle ) {
				$this->handler->mosp_mark_limit_puzzle_completed( $email, $phone );
			} else {
				MoSecurityHelper::mosp_mark_puzzle_verification_complete( $email, $phone );
			}

			$verification_token = MoSecurityHelper::mosp_generate_puzzle_verification_token( $email, $phone );

			wp_send_json_success(
				array(
					'message'            => __( 'Puzzle verified successfully', 'miniorange-otp-verification' ),
					'puzzle_cleared'     => true,
					'verification_token' => $verification_token,
					'puzzle_nonce'       => wp_create_nonce( 'mo_osp_puzzle_verify' ),
				)
			);
		}

		/**
		 * SECURITY FIX: Calculate the correct answer for a puzzle question
		 *
		 * @param string $question The puzzle question.
		 * @return int|false The correct answer or false if invalid.
		 */
		private function calculate_puzzle_answer( $question ) {
			if ( preg_match( '/(\d+)\s*([+\-×÷*\/])\s*(\d+)/', $question, $matches ) ) {
				$a        = intval( $matches[1] );
				$operator = $matches[2];
				$b        = intval( $matches[3] );

				switch ( $operator ) {
					case '+':
						return $a + $b;
					case '-':
						return $a - $b;
					case '×':
					case '*':
						return $a * $b;
					case '÷':
					case '/':
						return 0 !== $b ? intval( $a / $b ) : false;
					default:
						return false;
				}
			}

			if ( preg_match( '/(\d+)\s*([+\-])\s*(\d+)\s*([+\-])\s*(\d+)/', $question, $matches ) ) {
				$a   = intval( $matches[1] );
				$op1 = $matches[2];
				$b   = intval( $matches[3] );
				$op2 = $matches[4];
				$c   = intval( $matches[5] );

				$result = $a;
				$result = ( '+' === $op1 ) ? $result + $b : $result - $b;
				$result = ( '+' === $op2 ) ? $result + $c : $result - $c;

				return $result;
			}

			return false;
		}

		/**
		 * AJAX handler for checking timer status with persistent state management.
		 *
		 * @return void Sends JSON response.
		 */
		public function mosp_check_timer_status_ajax() {
			if ( ! wp_verify_nonce( sanitize_text_field( wp_unslash( $_POST['nonce'] ?? '' ) ), 'mo_osp_nonce' ) ) {
				wp_send_json_error( array( 'message' => __( 'Security check failed', 'miniorange-otp-verification' ) ) );
			}

			$browser_id = isset( $_POST['mo_osp_browser_id'] ) ? sanitize_text_field( wp_unslash( $_POST['mo_osp_browser_id'] ) ) : '';
			$email      = isset( $_POST['email'] ) ? sanitize_email( wp_unslash( $_POST['email'] ) ) : '';
			$phone      = isset( $_POST['phone'] ) ? MoUtility::process_phone_number( sanitize_text_field( wp_unslash( $_POST['phone'] ) ) ) : '';

			$state = $this->mosp_get_current_user_state( $email, $phone, $browser_id );
			wp_send_json_success( $state );
		}

		/**
		 * Get current user state with accurate timer information.
		 *
		 * @param string $email Email address.
		 * @param string $phone Phone number.
		 * @param string $browser_id Browser ID.
		 * @return array Current user state.
		 */
		private function mosp_get_current_user_state( $email, $phone, $browser_id ) {
			$settings     = $this->storage->mosp_get_settings();
			$current_time = time();

			$is_blocked = $this->handler->mosp_is_blocked( $email, $phone, $browser_id, 'timer_status' );

			if ( $is_blocked ) {
				$block_data      = $this->handler->mosp_get_block_data( $email, $phone, $browser_id, 'timer_status' );
				$block_remaining = $block_data['remaining_time'];
				$block_reason    = $block_data['reason'];

				if ( $block_remaining > 0 ) {
					return array(
						'blocked'        => true,
						'remaining_time' => $block_remaining,
						'blocked_type'   => $block_reason,
						'message'        => MoMessages::showMessage( MoMessages::USER_IS_BLOCKED_AJAX ),
					);
				}
			}

			$requires_regular_puzzle = $this->handler->mosp_requires_puzzle_verification( $email, $phone, $this->handler->mosp_get_client_ip(), $browser_id );
			$requires_limit_puzzle   = $this->handler->mosp_requires_limit_puzzle_verification( $email, $phone );
			$requires_puzzle         = $requires_regular_puzzle || $requires_limit_puzzle;

			if ( $requires_puzzle ) {
				return array(
					'puzzle_required' => true,
					'message'         => 'Please complete the security verification to continue.',
				);
			}

			$ip                = $this->handler->mosp_get_client_ip();
			$is_ip_whitelisted = false;
			if ( ! empty( $ip ) ) {
				$is_ip_whitelisted = $this->handler->mosp_is_whitelisted( $ip, 'ip' );
			}

			$cooldown_remaining = $is_ip_whitelisted ? 0 : $this->mosp_get_cooldown_remaining_time( $email, $phone, $browser_id );

			if ( $cooldown_remaining > 0 ) {
				return array(
					'status'         => 'cooldown',
					'cooldown'       => true,
					'timer_active'   => true,
					'remaining_time' => $cooldown_remaining,
					'message'        => MoMessages::showMessage( MoMessages::LIMIT_OTP_SENT ),
				);
			}

			return array(
				'status'  => 'ready',
				'message' => 'Ready to send OTP',
			);
		}

		/**
		 * Get remaining cooldown time for user.
		 *
		 * @param string $email Email address.
		 * @param string $phone Phone number.
		 * @param string $browser_id Browser ID.
		 * @return int Remaining cooldown time.
		 */
		private function mosp_get_cooldown_remaining_time( $email, $phone, $browser_id ) {
			try {
				$identifiers   = $this->handler->mosp_get_all_identifiers( $email, $phone, $this->handler->mosp_get_client_ip(), $browser_id );
				$current_time  = time();
				$settings      = $this->storage->mosp_get_settings();
				$cooldown_time = isset( $settings['cooldown_time'] ) ? (int) $settings['cooldown_time'] : 60;

				if ( empty( $identifiers ) || ! is_array( $identifiers ) ) {
					return 0;
				}

				foreach ( $identifiers as $identifier ) {
					if ( empty( $identifier ) ) {
						continue;
					}

					$key  = $this->storage->mosp_hash_key( $identifier );
					$data = $this->storage->mosp_get_spam_data( $key );

					if ( false === $data || ! isset( $data['attempts'] ) || ! is_array( $data['attempts'] ) ) {
						continue;
					}

					$attempts      = $data['attempts'];
					$attempt_count = count( $attempts );

					if ( $attempt_count < 2 ) {
						continue;
					}

					$sorted_attempts = $attempts;
					rsort( $sorted_attempts );

					if ( ! isset( $sorted_attempts[0] ) || ! isset( $sorted_attempts[1] ) ) {
						continue;
					}

					$most_recent_attempt    = (int) $sorted_attempts[0];
					$second_to_last_attempt = (int) $sorted_attempts[1];

					$time_between_attempts = $most_recent_attempt - $second_to_last_attempt;

					if ( $time_between_attempts < $cooldown_time ) {
						$cooldown_expires_at = $second_to_last_attempt + $cooldown_time;
						$remaining           = $cooldown_expires_at - $current_time;

						if ( $remaining > 0 ) {
							return $remaining;
						}
					}
				}
			} catch ( Exception $e ) {
				return 0;
			} catch ( Error $e ) {
				return 0;
			}

			return 0;
		}

		/**
		 * AJAX handler for checking puzzle requirement (separate from timer status)
		 *
		 * @return void Sends JSON response.
		 */
		public function mosp_check_puzzle_requirement_ajax() {
			if ( ! isset( $_POST['nonce'] ) || ! wp_verify_nonce( sanitize_text_field( wp_unslash( $_POST['nonce'] ) ), 'mo_osp_nonce' ) ) {
				wp_send_json_error( array( 'message' => __( 'Security check failed', 'miniorange-otp-verification' ) ) );
			}

			$email      = isset( $_POST['email'] ) ? sanitize_email( wp_unslash( $_POST['email'] ) ) : '';
			$phone      = isset( $_POST['phone'] ) ? sanitize_text_field( wp_unslash( $_POST['phone'] ) ) : '';
			$browser_id = isset( $_POST['mo_osp_browser_id'] ) ? sanitize_text_field( wp_unslash( $_POST['mo_osp_browser_id'] ) ) : '';

			$requires_regular_puzzle = $this->handler->mosp_requires_puzzle_verification( $email, $phone, $this->handler->mosp_get_client_ip(), $browser_id );
			$requires_limit_puzzle   = $this->handler->mosp_requires_limit_puzzle_verification( $email, $phone );
			$requires_puzzle         = $requires_regular_puzzle || $requires_limit_puzzle;

			wp_send_json_success(
				array(
					'puzzle_required' => $requires_puzzle,
					'regular_puzzle'  => $requires_regular_puzzle,
					'limit_puzzle'    => $requires_limit_puzzle,
					'message'         => $requires_puzzle ? MoMessages::showMessage( MoMessages::PLEASE_VALIDATE ) : __( 'No puzzle required', 'miniorange-otp-verification' ),
				)
			);
		}

		/**
		 * AJAX handler for checking if user is blocked in popup (similar to resendcontrol)
		 *
		 * Checks if the user is blocked and sends a JSON response.
		 * This function calculates the remaining block time and cooldown for a user.
		 * If the user is still blocked or on cooldown, it returns the remaining time.
		 *
		 * @return void Sends a JSON response with the blocked status and remaining time.
		 */
		public function mosp_check_blocked_ajax() {
			// phpcs:disable WordPress.Security.NonceVerification.Missing -- Public AJAX endpoint, nonce not required for read operations.
			try {
				$browser_id = isset( $_POST['mo_osp_browser_id'] ) ? sanitize_text_field( wp_unslash( $_POST['mo_osp_browser_id'] ) ) : '';
				$email      = isset( $_POST['email'] ) ? sanitize_email( wp_unslash( $_POST['email'] ) ) : '';
				$phone      = isset( $_POST['phone'] ) ? sanitize_text_field( wp_unslash( $_POST['phone'] ) ) : '';

				$is_blocked = $this->handler->mosp_is_blocked( $email, $phone, $browser_id, 'timer_status' );

				if ( $is_blocked ) {
					$block_data      = $this->handler->mosp_get_block_data( $email, $phone, $browser_id, 'timer_status' );
					$block_remaining = isset( $block_data['remaining_time'] ) ? $block_data['remaining_time'] : 0;
					$block_reason    = isset( $block_data['reason'] ) ? $block_data['reason'] : '';

					if ( $block_remaining > 0 ) {
						wp_send_json(
							array(
								'blocked'        => true,
								'remaining_time' => $block_remaining,
								'blocked_type'   => $block_reason,
								'message'        => MoMessages::showMessage( MoMessages::USER_IS_BLOCKED_AJAX ),
							)
						);
						return;
					}
				}

				$ip                = $this->handler->mosp_get_client_ip();
				$is_ip_whitelisted = false;
				if ( ! empty( $ip ) ) {
					$is_ip_whitelisted = $this->handler->mosp_is_whitelisted( $ip, 'ip' );
				}

				$cooldown_remaining = $is_ip_whitelisted ? 0 : $this->mosp_get_cooldown_remaining_time( $email, $phone, $browser_id );

				if ( $cooldown_remaining > 0 ) {
					wp_send_json(
						array(
							'cooldown'       => true,
							'remaining_time' => $cooldown_remaining,
							'message'        => MoMessages::showMessage( MoMessages::LIMIT_OTP_SENT ),
						)
					);
					return;
				}

				wp_send_json(
					array(
						'blocked'  => false,
						'cooldown' => false,
					)
				);
			} catch ( Exception $e ) {
				wp_send_json_error(
					array(
						'message' => __( 'An error occurred while checking status.', 'miniorange-otp-verification' ),
						'error'   => defined( 'WP_DEBUG' ) && WP_DEBUG ? $e->getMessage() : '',
					)
				);
			} catch ( Error $e ) {
				wp_send_json_error(
					array(
						'message' => __( 'An error occurred while checking status.', 'miniorange-otp-verification' ),
						'error'   => defined( 'WP_DEBUG' ) && WP_DEBUG ? $e->getMessage() : '',
					)
				);
			}
		}

		/**
		 * AJAX handler for unblocking user in popup (similar to resendcontrol)
		 *
		 * Unblocks a user if the block duration has expired and sends a JSON response.
		 * This function checks whether the user's block time has expired. If expired,
		 * it removes the block and sends a response indicating the user is unblocked.
		 *
		 * @return void Sends a JSON response with the blocked/unblocked status.
		 */
		public function mosp_unblock_user_ajax() {
			// phpcs:disable WordPress.Security.NonceVerification.Missing -- Public AJAX endpoint, nonce not required for read operations.
			$browser_id = isset( $_POST['mo_osp_browser_id'] ) ? sanitize_text_field( wp_unslash( $_POST['mo_osp_browser_id'] ) ) : '';
			$email      = isset( $_POST['email'] ) ? sanitize_email( wp_unslash( $_POST['email'] ) ) : '';
			$phone      = isset( $_POST['phone'] ) ? sanitize_text_field( wp_unslash( $_POST['phone'] ) ) : '';

			$is_blocked = $this->handler->mosp_is_blocked( $email, $phone, $browser_id, 'timer_status' );

			if ( ! $is_blocked ) {
				wp_send_json( array( 'unblocked' => true ) );
				return;
			}

			$block_data      = $this->handler->mosp_get_block_data( $email, $phone, $browser_id, 'timer_status' );
			$block_remaining = $block_data['remaining_time'];

			wp_send_json(
				array(
					'blocked'        => true,
					'remaining_time' => $block_remaining,
				)
			);
		}
	}
}
