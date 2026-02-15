<?php
/**
 * OTP Spam Preventer Main Handler
 *
 * @package otpspampreventer/handler
 */

namespace OSP\Handler;

use OSP\Handler\MoOtpSpamStorage;
use OSP\Helper\MoRateLimitHelper;
use OSP\Helper\MoSecurityHelper;
use OSP\Traits\Instance;
use OTP\Helper\MoMessages;
use OTP\Helper\MoPHPSessions;


if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

if ( ! class_exists( 'MoOtpSpamPreventerHandler' ) ) {
	/**
	 * The main handler class for OTP Spam Prevention functionality.
	 * Integrates with the existing OTP verification flow.
	 * Updated: Fixed block expiration logic
	 */
	class MoOtpSpamPreventerHandler {

		use Instance;

		/**
		 * Storage instance
		 *
		 * @var MoOtpSpamStorage
		 */
		private $storage;

		/**
		 * Constructor
		 */
		public function __construct() {
			$this->storage = MoOtpSpamStorage::instance();
			MoRateLimitHelper::init( $this->storage );
		}

		/**
		 * Save settings from POST data.
		 *
		 * @param array $posted POST data array.
		 * @return array Result array with 'success' and 'message' keys.
		 */
		public function mosp_save_settings( $posted ) {
			$settings                  = array();
			$settings['enabled']       = true;
			$settings['cooldown_time'] = isset( $posted['mo_osp_cooldown_time'] ) ? absint( $posted['mo_osp_cooldown_time'] ) : 60;

			$max_attempts             = isset( $posted['mo_osp_max_attempts'] ) ? absint( $posted['mo_osp_max_attempts'] ) : 3;
			$settings['max_attempts'] = max( 1, min( 10, $max_attempts ) );

			$settings['block_time'] = isset( $posted['mo_osp_block_time'] ) ? absint( $posted['mo_osp_block_time'] ) : 3600;

			$settings['daily_limit']  = isset( $posted['mo_osp_daily_limit'] ) ? absint( $posted['mo_osp_daily_limit'] ) : 10;
			$settings['hourly_limit'] = isset( $posted['mo_osp_hourly_limit'] ) ? absint( $posted['mo_osp_hourly_limit'] ) : 5;

			$validation_errors = array();

			if ( $settings['hourly_limit'] <= $settings['max_attempts'] ) {
				$validation_errors[] = 'Hourly limit (' . $settings['hourly_limit'] . ') must be greater than max attempts per window (' . $settings['max_attempts'] . ')';
			}

			if ( $settings['daily_limit'] <= $settings['hourly_limit'] ) {
				$validation_errors[] = 'Daily limit (' . $settings['daily_limit'] . ') must be greater than hourly limit (' . $settings['hourly_limit'] . ')';
			}

			if ( ! empty( $validation_errors ) ) {
				$error_message = 'Settings validation failed: ' . implode( '; ', $validation_errors );
				do_action( 'mo_otp_verification_show_message', $error_message, 'ERROR' );
				return array(
					'success' => false,
					'message' => $error_message,
				);
			}

			$settings['track_phone']   = true;
			$settings['track_email']   = true;
			$settings['track_ip']      = true;
			$settings['track_browser'] = true;

			// Process whitelists.
			$whitelist_ips             = isset( $posted['mo_osp_whitelist_ips'] ) ? sanitize_textarea_field( wp_unslash( $posted['mo_osp_whitelist_ips'] ) ) : '';
			$settings['whitelist_ips'] = array_filter( array_map( 'trim', explode( "\n", $whitelist_ips ) ) );
			$settings['whitelist_ips'] = array_values( $settings['whitelist_ips'] );

			$result = $this->storage->mosp_update_settings( $settings );

			if ( $result ) {
				return array(
					'success' => true,
					'message' => __( 'Settings saved successfully!', 'miniorange-otp-verification' ),
				);
			} else {
				return array(
					'success' => false,
					'message' => __( 'Failed to save settings!', 'miniorange-otp-verification' ),
				);
			}
		}

		/**
		 * Check if identifier is whitelisted.
		 *
		 * @param string $identifier The identifier to check (IP, email, phone, etc.).
		 * @param string $type The type of identifier (ip, email, phone).
		 * @return bool True if whitelisted, false otherwise.
		 */
		public function mosp_is_whitelisted( $identifier, $type ) {
			return $this->storage->mosp_is_whitelisted( $identifier, $type );
		}

		/**
		 * Check if a request should be blocked due to spam prevention rules
		 *
		 * @param string $email Email address.
		 * @param string $phone Phone number.
		 * @param string $browser_id Browser fingerprint ID.
		 * @param string $context Context of the check ('otp_send' or 'timer_status').
		 * @return bool True if blocked, false if allowed
		 */
		public function mosp_is_blocked( $email, $phone, $browser_id = '', $context = 'otp_send' ) {
			$settings = $this->storage->mosp_get_settings();

			$ip = $this->mosp_get_client_ip();

			if ( ! empty( $ip ) ) {
				$is_whitelisted = $this->storage->mosp_is_whitelisted( $ip, 'ip' );
				if ( $is_whitelisted ) {
					return false;
				}
			}

			$this->mosp_log_security_event( $email, $phone, $ip, $browser_id );

			$ip_switching_detected = $this->detect_ip_switching_attack( $email, $phone, $browser_id, $ip );
			if ( $ip_switching_detected ) {
				$this->mosp_log_security_event( $email, $phone, $ip, $browser_id, 'IP_SWITCHING_DETECTED' );
				return true;
			}

			$daily_limit_exceeded = $this->mosp_is_daily_limit_exceeded( $email, $phone, $settings, $context );
			if ( $daily_limit_exceeded ) {
				return true;
			}

			$hourly_limit_exceeded = $this->mosp_is_hourly_limit_exceeded( $email, $phone, $settings, $context );
			if ( $hourly_limit_exceeded ) {
				return true;
			}

			$identifiers = $this->mosp_get_all_identifiers( $email, $phone, $ip, $browser_id );

			foreach ( $identifiers as $identifier ) {
				$identifier_blocked = $this->is_identifier_blocked( $identifier );
				if ( $identifier_blocked ) {
					return true;
				}
			}

			$cross_identifier_blocked = $this->mosp_is_cross_identifier_blocked( $email, $phone, $ip, $browser_id );
			if ( $cross_identifier_blocked ) {
				return true;
			}

			return false;
		}

		/**
		 * Record an OTP attempt for rate limiting (new method for integration)
		 *
		 * @param string $email Email address.
		 * @param string $phone Phone number.
		 * @param string $browser_id Browser fingerprint ID.
		 * @return void
		 */
		public function mosp_record_attempt_for_identifiers( $email, $phone, $browser_id = '' ) {
			$settings = $this->storage->mosp_get_settings();

			$ip = $this->mosp_get_client_ip();

			$identifiers = $this->mosp_get_all_identifiers( $email, $phone, $ip, $browser_id );

			$current_time = time();

			foreach ( $identifiers as $identifier ) {
				$this->mosp_record_identifier_attempt( $identifier, $current_time );
			}

			$this->mosp_record_cross_identifier_attempt( $email, $phone, $ip, $browser_id, $current_time );

			$this->mosp_record_daily_hourly_attempts( $email, $phone );
		}

		/**
		 * Store a block for all identifiers when a block is detected via "would be blocked" check.
		 * This ensures the block persists in the database so the timer doesn't reset on each click.
		 *
		 * @param string $email Email address.
		 * @param string $phone Phone number.
		 * @param string $browser_id Browser fingerprint ID.
		 * @param string $block_reason Reason for the block (e.g., 'max_attempts_exceeded', 'cooldown').
		 * @param int    $remaining_time Remaining time in seconds until block expires.
		 * @return void
		 */
		public function mosp_store_block_for_identifiers( $email, $phone, $browser_id, $block_reason, $remaining_time ) {
			$ip            = $this->mosp_get_client_ip();
			$identifiers   = $this->mosp_get_all_identifiers( $email, $phone, $ip, $browser_id );
			$now           = time();
			$blocked_until = $now + $remaining_time;

			foreach ( $identifiers as $identifier ) {
				$key  = $this->storage->mosp_hash_key( $identifier );
				$data = $this->storage->mosp_get_spam_data( $key );

				if ( false === $data ) {
					$data = array(
						'type'          => 'identifier',
						'attempts'      => array(),
						'blocked_until' => 0,
						'total_blocks'  => 0,
						'created'       => $now,
						'last_attempt'  => $now,
					);
				}

				if ( ! isset( $data['blocked_until'] ) || $data['blocked_until'] < $blocked_until ) {
					$data['blocked_until'] = $blocked_until;
					$data['block_reason']  = $block_reason;
					$this->storage->mosp_update_spam_data( $key, $data );
				}
			}
		}

		/**
		 * Get all identifiers for the current request.
		 *
		 * @param string $email Email address.
		 * @param string $phone Phone number.
		 * @param string $ip IP address.
		 * @param string $browser_id Browser fingerprint ID.
		 * @return array Array of identifiers
		 */
		public function mosp_get_all_identifiers( $email, $phone, $ip, $browser_id ) {
			$identifiers = array();

			if ( ! empty( $email ) ) {
				$identifiers[] = 'email:' . $email;
			}

			if ( ! empty( $phone ) ) {
				$identifiers[] = 'phone:' . $phone;
			}

			if ( ! empty( $ip ) ) {
				$identifiers[] = 'ip:' . $ip;
			}

			if ( ! empty( $browser_id ) ) {
				$identifiers[] = 'browser:' . $browser_id;
			}

			return $identifiers;
		}

		/**
		 * Check cross-identifier blocking (IP + OTP type combination).
		 *
		 * @param string $email Email address.
		 * @param string $phone Phone number.
		 * @param string $ip IP address.
		 * @param string $browser_id Browser fingerprint ID.
		 * @return bool True if should be blocked
		 */
		private function mosp_is_cross_identifier_blocked( $email, $phone, $ip, $browser_id ) {
			if ( empty( $ip ) ) {
				return false;
			}

			$cross_identifiers = array();

			if ( ! empty( $email ) ) {
				$cross_identifiers[] = 'cross_ip_email:' . $ip . '|' . $email;
			}

			if ( ! empty( $phone ) ) {
				$cross_identifiers[] = 'cross_ip_phone:' . $ip . '|' . $phone;
			}

			if ( ! empty( $browser_id ) ) {
				$cross_identifiers[] = 'cross_ip_browser:' . $ip . '|' . $browser_id;
			}

			foreach ( $cross_identifiers as $cross_identifier ) {
				$cross_blocked = $this->is_identifier_blocked( $cross_identifier );
				if ( $cross_blocked ) {
					return true;
				}
			}

			return false;
		}

		/**
		 * Record cross-identifier attempt.
		 *
		 * @param string $email Email address.
		 * @param string $phone Phone number.
		 * @param string $ip IP address.
		 * @param string $browser_id Browser fingerprint ID.
		 * @param int    $current_time Current timestamp.
		 * @return void
		 */
		private function mosp_record_cross_identifier_attempt( $email, $phone, $ip, $browser_id, $current_time ) {
			if ( empty( $ip ) ) {
				return;
			}

			$cross_identifiers = array();

			if ( ! empty( $email ) ) {
				$cross_identifiers[] = 'cross_ip_email:' . $ip . '|' . $email;
			}

			if ( ! empty( $phone ) ) {
				$cross_identifiers[] = 'cross_ip_phone:' . $ip . '|' . $phone;
			}

			if ( ! empty( $browser_id ) ) {
				$cross_identifiers[] = 'cross_ip_browser:' . $ip . '|' . $browser_id;
			}

			foreach ( $cross_identifiers as $cross_identifier ) {
				$this->mosp_record_identifier_attempt( $cross_identifier, $current_time );
			}
		}

		/**
		 * Get block data for identifiers.
		 *
		 * @param string $email Email address.
		 * @param string $phone Phone number.
		 * @param string $browser_id Browser fingerprint ID.
		 * @param string $context Context of the check ('otp_send' or 'timer_status').
		 * @return array Block data with remaining time
		 */
		public function mosp_get_block_data( $email, $phone, $browser_id = '', $context = 'otp_send' ) {
			$current_time = time();
			$settings     = $this->storage->mosp_get_settings();

			$ip = $this->mosp_get_client_ip();

			if ( ! empty( $ip ) ) {
				$is_whitelisted = $this->storage->mosp_is_whitelisted( $ip, 'ip' );
				if ( $is_whitelisted ) {
					return array(
						'remaining_time' => 0,
						'reason'         => '',
					);
				}
			}

			$max_remaining_time = 0;
			$block_reason       = '';

			if ( $this->mosp_is_daily_limit_exceeded( $email, $phone, $settings, $context ) ) {
				$max_remaining_time = $this->mosp_get_daily_limit_reset_time( $email, $phone );
				$block_reason       = 'daily_limit_exceeded';
			} elseif ( $this->mosp_is_hourly_limit_exceeded( $email, $phone, $settings, $context ) ) {
				$max_remaining_time = $this->mosp_get_hourly_limit_reset_time( $email, $phone );
				$block_reason       = 'hourly_limit_exceeded';
			}

			if ( $max_remaining_time <= 0 ) {
				$identifiers = $this->mosp_get_all_identifiers( $email, $phone, $ip, $browser_id );

				foreach ( $identifiers as $identifier ) {
					$block_data = $this->storage->mosp_is_blocked( $identifier );

					if ( $block_data['blocked'] ) {
						$blocked_until = $block_data['blocked_until'];
						$remaining     = $blocked_until - $current_time;
						if ( $remaining > $max_remaining_time ) {
							$max_remaining_time = $remaining;
							$block_reason       = $block_data['reason'];
						}
					}
				}
			}

			$final_remaining = max( 0, $max_remaining_time );
			return array(
				'remaining_time' => $final_remaining,
				'reason'         => $block_reason,
			);
		}

		/**
		 * Get block message with timer.
		 *
		 * @param int    $remaining_time Remaining block time in seconds.
		 * @param string $message_type Optional message type constant (defaults to USER_IS_BLOCKED_AJAX).
		 * @return string Block message with timer placeholder
		 */
		public function mosp_get_block_message_with_timer( $remaining_time, $message_type = null ) {
			$minutes = floor( $remaining_time / 60 );
			$seconds = $remaining_time % 60;

			$formatted_minutes = sprintf( '%02d', $minutes );
			$formatted_seconds = sprintf( '%02d', $seconds );

			$message_constant = $message_type ? $message_type : MoMessages::USER_IS_BLOCKED_AJAX;
			$message_template = MoMessages::showMessage( $message_constant );

			$message = $message_template;

			if ( strpos( $message, '{minutes}' ) !== false || strpos( $message, '{seconds}' ) !== false ) {
				$message = str_replace(
					array( '{minutes}', '{seconds}' ),
					array( $formatted_minutes, $formatted_seconds ),
					$message
				);
			}

			if ( strpos( $message, '{{remaining_time}}' ) !== false ) {
				$time_display = sprintf( '%02d:%02d', $minutes, $seconds );
				$message      = str_replace( '{{remaining_time}}', $time_display, $message );
			}

			if ( strpos( $message, '%' ) !== false ) {
				$time_display = sprintf( '%02d:%02d', $minutes, $seconds );
				$message      = sprintf( $message, $time_display );
			}

			return $message;
		}

		/**
		 * Check if user would be blocked after recording one more attempt.
		 * This prevents race condition where OTP is sent successfully but user gets blocked immediately after
		 *
		 * @param string $email Email address.
		 * @param string $phone Phone number.
		 * @param string $browser_id Browser fingerprint ID.
		 * @return bool True if would be blocked after attempt, false otherwise
		 */
		public function mosp_would_be_blocked_after_attempt( $email, $phone, $browser_id = '' ) {
			$result = $this->mosp_would_be_blocked_after_attempt_with_details( $email, $phone, $browser_id );
			return $result['would_be_blocked'];
		}

		/**
		 * Check if user would be blocked after recording one more attempt, with detailed information.
		 * This prevents race condition where OTP is sent successfully but user gets blocked immediately after.
		 *
		 * @param string $email Email address.
		 * @param string $phone Phone number.
		 * @param string $browser_id Browser fingerprint ID.
		 * @return array Array with 'would_be_blocked' (bool), 'reason' (string), and 'remaining_time' (int)
		 */
		public function mosp_would_be_blocked_after_attempt_with_details( $email, $phone, $browser_id = '' ) {
			$settings    = $this->storage->mosp_get_settings();
			$ip          = $this->mosp_get_client_ip();
			$identifiers = $this->mosp_get_all_identifiers( $email, $phone, $ip, $browser_id );

			foreach ( $identifiers as $identifier ) {
				$block_data = $this->storage->mosp_is_blocked( $identifier );
				if ( $block_data['blocked'] && 'cooldown' === $block_data['reason'] ) {
					$now            = time();
					$remaining_time = $block_data['blocked_until'] - $now;
					if ( $remaining_time > 0 ) {
						return array(
							'would_be_blocked' => true,
							'reason'           => 'cooldown',
							'remaining_time'   => $remaining_time,
						);
					}
				}
			}

			foreach ( $identifiers as $identifier ) {
				$cooldown_result = $this->mosp_would_be_on_cooldown_after_attempt_with_details( $identifier, $settings );
				if ( $cooldown_result['would_be_on_cooldown'] ) {
					return array(
						'would_be_blocked' => true,
						'reason'           => 'cooldown',
						'remaining_time'   => $cooldown_result['remaining_time'],
					);
				}
			}

			if ( $this->mosp_would_exceed_hourly_limit_after_attempt( $email, $phone, $settings ) ) {
				$remaining_time = $this->mosp_get_hourly_limit_reset_time( $email, $phone );
				return array(
					'would_be_blocked' => true,
					'reason'           => 'hourly_limit_exceeded',
					'remaining_time'   => $remaining_time,
				);
			}

			if ( $this->mosp_would_exceed_daily_limit_after_attempt( $email, $phone, $settings ) ) {
				$remaining_time = $this->mosp_get_daily_limit_reset_time( $email, $phone );
				return array(
					'would_be_blocked' => true,
					'reason'           => 'daily_limit_exceeded',
					'remaining_time'   => $remaining_time,
				);
			}

			foreach ( $identifiers as $identifier ) {
				$max_attempts_result = $this->mosp_would_exceed_max_attempts_after_attempt_with_details( $identifier, $settings );
				if ( $max_attempts_result['would_exceed'] ) {
					return array(
						'would_be_blocked' => true,
						'reason'           => 'max_attempts_exceeded',
						'remaining_time'   => $max_attempts_result['remaining_time'],
					);
				}
			}

			return array(
				'would_be_blocked' => false,
				'reason'           => '',
				'remaining_time'   => 0,
			);
		}

		/**
		 * Check if recording one more attempt would exceed hourly limit.
		 *
		 * @param string $email Email address.
		 * @param string $phone Phone number.
		 * @param array  $settings Plugin settings.
		 * @return bool True if would exceed hourly limit after attempt, false otherwise
		 */
		private function mosp_would_exceed_hourly_limit_after_attempt( $email, $phone, $settings ) {
			$identifiers = $this->mosp_get_limit_identifiers( $email, $phone );
			if ( empty( $identifiers ) ) {
				return false;
			}

			foreach ( $identifiers as $identifier ) {
				if ( $this->mosp_has_completed_limit_puzzle_for_identifier( $identifier ) ) {
					continue;
				}
				$current_attempts = MoRateLimitHelper::mosp_get_hourly_attempts( $identifier );
				if ( ( $current_attempts + 1 ) > $settings['hourly_limit'] ) {
					return true;
				}
			}

			return false;
		}

		/**
		 * Check if recording one more attempt would exceed daily limit.
		 *
		 * @param string $email Email address.
		 * @param string $phone Phone number.
		 * @param array  $settings Plugin settings.
		 * @return bool True if would exceed daily limit after attempt, false otherwise
		 */
		private function mosp_would_exceed_daily_limit_after_attempt( $email, $phone, $settings ) {
			$identifiers = $this->mosp_get_limit_identifiers( $email, $phone );
			if ( empty( $identifiers ) ) {
				return false;
			}

			foreach ( $identifiers as $identifier ) {
				if ( $this->mosp_has_completed_limit_puzzle_for_identifier( $identifier ) ) {
					continue;
				}
				$current_attempts = MoRateLimitHelper::mosp_get_daily_attempts( $identifier );
				if ( ( $current_attempts + 1 ) > $settings['daily_limit'] ) {
					return true;
				}
			}

			return false;
		}

		/**
		 * Check if recording one more attempt would exceed max attempts for identifier.
		 *
		 * @param string $identifier The identifier to check.
		 * @param array  $settings Plugin settings.
		 * @return bool True if would exceed max attempts after attempt, false otherwise
		 */
		private function mosp_would_exceed_max_attempts_after_attempt( $identifier, $settings ) {
			$result = $this->mosp_would_exceed_max_attempts_after_attempt_with_details( $identifier, $settings );
			return $result['would_exceed'];
		}

		/**
		 * Check if recording one more attempt would exceed max attempts, with detailed information.
		 *
		 * @param string $identifier The identifier to check.
		 * @param array  $settings Plugin settings.
		 * @return array Array with 'would_exceed' (bool) and 'remaining_time' (int)
		 */
		private function mosp_would_exceed_max_attempts_after_attempt_with_details( $identifier, $settings ) {
			$key  = $this->storage->mosp_hash_key( $identifier );
			$data = $this->storage->mosp_get_spam_data( $key );
			$now  = time();

			if ( false === $data || ! isset( $data['attempts'] ) || ! is_array( $data['attempts'] ) || empty( $data['attempts'] ) ) {
				return array(
					'would_exceed'   => false,
					'remaining_time' => 0,
				);
			}

			if ( isset( $data['blocked_until'] ) && $data['blocked_until'] > $now ) {
				$block_reason = isset( $data['block_reason'] ) ? $data['block_reason'] : '';
				if ( 'max_attempts_exceeded' === $block_reason ) {
					$remaining_time = $data['blocked_until'] - $now;
					return array(
						'would_exceed'   => true,
						'remaining_time' => $remaining_time,
					);
				}
			}

			$time_window     = MoSecurityHelper::COUNTING_WINDOW_SECONDS; // 15 minutes.
			$cutoff_time     = $now - $time_window;
			$recent_attempts = array();

			foreach ( $data['attempts'] as $timestamp ) {
				if ( $timestamp > $cutoff_time ) {
					$recent_attempts[] = $timestamp;
				}
			}

			$recent_attempts_count = count( $recent_attempts );

			if ( ( $recent_attempts_count + 1 ) > $settings['max_attempts'] ) {
				if ( isset( $data['blocked_until'] ) && $data['blocked_until'] > $now ) {
					$block_reason = isset( $data['block_reason'] ) ? $data['block_reason'] : '';
					if ( 'max_attempts_exceeded' === $block_reason ) {
						$remaining_time = $data['blocked_until'] - $now;
						return array(
							'would_exceed'   => true,
							'remaining_time' => $remaining_time,
						);
					}
				}

				$block_time_seconds = $settings['block_time'];
				$remaining_time     = $block_time_seconds;

				return array(
					'would_exceed'   => true,
					'remaining_time' => $remaining_time,
				);
			}

			return array(
				'would_exceed'   => false,
				'remaining_time' => 0,
			);
		}

		/**
		 * Check if recording one more attempt would put the identifier on cooldown.
		 * This checks if there's a recent attempt that would trigger cooldown after adding this attempt.
		 *
		 * @param string $identifier The identifier to check.
		 * @param array  $settings Plugin settings.
		 * @return bool True if would be on cooldown after attempt, false otherwise
		 */
		private function mosp_would_be_on_cooldown_after_attempt( $identifier, $settings ) {
			$result = $this->mosp_would_be_on_cooldown_after_attempt_with_details( $identifier, $settings );
			return $result['would_be_on_cooldown'];
		}

		/**
		 * Check if recording one more attempt would put the identifier on cooldown, with detailed information.
		 * This checks if there's a recent attempt that would trigger cooldown after adding this attempt.
		 *
		 * @param string $identifier The identifier to check.
		 * @param array  $settings Plugin settings.
		 * @return array Array with 'would_be_on_cooldown' (bool) and 'remaining_time' (int)
		 */
		private function mosp_would_be_on_cooldown_after_attempt_with_details( $identifier, $settings ) {
			$key  = $this->storage->mosp_hash_key( $identifier );
			$data = $this->storage->mosp_get_spam_data( $key );
			$now  = time();

			if ( false === $data || ! isset( $data['attempts'] ) || ! is_array( $data['attempts'] ) || empty( $data['attempts'] ) ) {
				return array(
					'would_be_on_cooldown' => false,
					'remaining_time'       => 0,
				);
			}

			$cooldown_time = $settings['cooldown_time'];
			$attempts      = $data['attempts'];
			$attempt_count = count( $attempts );

			if ( 1 === $attempt_count ) {
				$most_recent_attempt    = max( $attempts );
				$time_since_most_recent = $now - $most_recent_attempt;

				if ( $time_since_most_recent < $cooldown_time ) {
					$remaining_cooldown = $cooldown_time - $time_since_most_recent;
					return array(
						'would_be_on_cooldown' => true,
						'remaining_time'       => $remaining_cooldown,
					);
				}

				return array(
					'would_be_on_cooldown' => false,
					'remaining_time'       => 0,
				);
			}
			$most_recent_attempt = max( $attempts );

			$time_since_most_recent = $now - $most_recent_attempt;

			if ( $time_since_most_recent < $cooldown_time ) {
				$remaining_cooldown = $cooldown_time - $time_since_most_recent;
				if ( $remaining_cooldown < 0 ) {
					$remaining_cooldown = 0;
				}
				return array(
					'would_be_on_cooldown' => true,
					'remaining_time'       => $remaining_cooldown,
				);
			}

			return array(
				'would_be_on_cooldown' => false,
				'remaining_time'       => 0,
			);
		}

		/**
		 * Check if a specific identifier is blocked.
		 *
		 * @param string $identifier The identifier to check.
		 * @return bool True if blocked, false otherwise
		 */
		private function is_identifier_blocked( $identifier ) {
			// Use the storage method that contains the complete blocking logic.
			$block_data = $this->storage->mosp_is_blocked( $identifier );
			return $block_data['blocked'];
		}

		/**
		 * Record an attempt for a specific identifier.
		 *
		 * @param string $identifier The identifier.
		 * @param int    $current_time Current timestamp.
		 */
		private function mosp_record_identifier_attempt( $identifier, $current_time ) {
			$this->storage->mosp_record_attempt_with_timestamp( $identifier, $current_time );
		}

		/**
		 * Check for spam before OTP is sent.
		 *
		 * @param bool   $allow Whether to allow OTP sending.
		 * @param string $user_login Username.
		 * @param string $user_email Email address.
		 * @param string $phone_number Phone number.
		 * @return bool|WP_Error
		 */
		public function mosp_check_spam_before_otp_send( $allow, $user_login, $user_email, $phone_number ) {
			$settings = $this->storage->mosp_get_settings();

			if ( ! empty( $user_email ) ) {
				MoPHPSessions::add_session_var( 'user_email', $user_email );
			}
			if ( ! empty( $phone_number ) ) {
				MoPHPSessions::add_session_var( 'phone_number_mo', $phone_number );
			}

			$identifiers = $this->mosp_get_request_identifiers( $user_email, $phone_number );

			foreach ( $identifiers as $type => $identifier ) {
				if ( empty( $identifier ) ) {
					continue;
				}

				if ( $this->storage->mosp_is_whitelisted( $identifier, $type ) ) {
					continue;
				}

				$block_status = $this->storage->mosp_is_blocked( $identifier );

				if ( $block_status['blocked'] ) {
					return $this->create_block_error( $block_status, $type, $identifier );
				}
			}

			return $allow;
		}

		/**
		 * Record OTP attempt after successful send
		 *
		 * @param string $user_login Username.
		 * @param string $user_email Email address.
		 * @param string $phone_number Phone number.
		 * @return void
		 */
		public function mosp_record_otp_attempt( $user_login, $user_email, $phone_number ) {
			$settings = $this->storage->mosp_get_settings();

			$identifiers = $this->mosp_get_request_identifiers( $user_email, $phone_number );

			foreach ( $identifiers as $type => $identifier ) {
				if ( empty( $identifier ) || $this->storage->mosp_is_whitelisted( $identifier, $type ) ) {
					continue;
				}

				$this->storage->mosp_record_attempt( $identifier, $type );
			}
		}

		/**
		 * Get all identifiers for the current request.
		 *
		 * @param string $email Email address.
		 * @param string $phone Phone number.
		 * @return array Array of identifiers.
		 */
		private function mosp_get_request_identifiers( $email, $phone ) {
			$settings    = $this->storage->mosp_get_settings();
			$identifiers = array();

			if ( $settings['track_email'] && ! empty( $email ) ) {
				$identifiers['email'] = strtolower( trim( $email ) );
			}

			if ( $settings['track_phone'] && ! empty( $phone ) ) {
				$identifiers['phone'] = preg_replace( '/[^0-9+]/', '', $phone );
			}

			if ( $settings['track_ip'] ) {
				$ip = $this->mosp_get_client_ip();
				if ( $ip ) {
					$identifiers['ip'] = $ip;
				}
			}

			if ( $settings['track_browser'] ) {
				$browser_id = $this->get_browser_id();
				if ( $browser_id ) {
					$identifiers['browser'] = $browser_id;
				}
			}

			return $identifiers;
		}

		/**
		 * Get client IP address with anti-spoofing protection
		 *
		 * @return string
		 */
		public function mosp_get_client_ip() {
			$ip_candidates = $this->get_ip_candidates();

			if ( ! empty( $_SERVER['REMOTE_ADDR'] ) ) {
				$remote_addr = sanitize_text_field( wp_unslash( $_SERVER['REMOTE_ADDR'] ) );
				if ( filter_var( $remote_addr, FILTER_VALIDATE_IP ) &&
					! filter_var( $remote_addr, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE ) ) {
					if ( $this->storage->mosp_is_whitelisted( $remote_addr, 'ip' ) ) {
						return $remote_addr;
					}
				}
			}

			$validated_ip = $this->validate_ip_security( $ip_candidates );

			return $validated_ip;
		}

		/**
		 * Get all possible IP addresses from headers.
		 *
		 * @return array Array of IP candidates with their sources
		 */
		private function get_ip_candidates() {
			$candidates = array();

			$ip_sources = array(
				'REMOTE_ADDR'              => array(
					'priority'  => 1,
					'spoofable' => false,
				),
				'HTTP_CLIENT_IP'           => array(
					'priority'  => 2,
					'spoofable' => true,
				),
				'HTTP_CF_CONNECTING_IP'    => array(
					'priority'  => 3,
					'spoofable' => false,
				),
				'HTTP_X_REAL_IP'           => array(
					'priority'  => 4,
					'spoofable' => true,
				),
				'HTTP_X_FORWARDED_FOR'     => array(
					'priority'  => 5,
					'spoofable' => true,
				),
				'HTTP_X_FORWARDED'         => array(
					'priority'  => 6,
					'spoofable' => true,
				),
				'HTTP_X_CLUSTER_CLIENT_IP' => array(
					'priority'  => 7,
					'spoofable' => true,
				),
				'HTTP_FORWARDED_FOR'       => array(
					'priority'  => 8,
					'spoofable' => true,
				),
				'HTTP_FORWARDED'           => array(
					'priority'  => 9,
					'spoofable' => true,
				),
			);

			foreach ( $ip_sources as $header => $config ) {
				if ( ! empty( $_SERVER[ $header ] ) ) {
					$raw_value = sanitize_text_field( wp_unslash( $_SERVER[ $header ] ) );
					$ips       = $this->parse_ip_header( $raw_value );

					foreach ( $ips as $ip ) {
						if ( $this->is_valid_public_ip( $ip ) ) {
							$candidates[] = array(
								'ip'         => $ip,
								'source'     => $header,
								'priority'   => $config['priority'],
								'spoofable'  => $config['spoofable'],
								'raw_header' => $raw_value,
							);
						}
					}
				}
			}

			return $candidates;
		}

		/**
		 * Parse IP header value (handles comma-separated lists).
		 *
		 * @param string $header_value Raw header value.
		 * @return array Array of IP addresses.
		 */
		private function parse_ip_header( $header_value ) {
			$ips = array();

			if ( strpos( $header_value, ',' ) !== false ) {
				$parts = explode( ',', $header_value );
				foreach ( $parts as $part ) {
					$ip = trim( $part );
					if ( ! empty( $ip ) ) {
						$ips[] = $ip;
					}
				}
			} else {
				$ips[] = trim( $header_value );
			}

			return $ips;
		}

		/**
		 * Validate IP with security checks.
		 *
		 * @param string $ip IP address to validate.
		 * @return bool True if valid public IP.
		 */
		private function is_valid_public_ip( $ip ) {
			if ( ! filter_var( $ip, FILTER_VALIDATE_IP ) ) {
				return false;
			}

			if ( ! filter_var( $ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE ) ) {
				return false;
			}

			if ( $this->is_suspicious_ip( $ip ) ) {
				return false;
			}

			return true;
		}

		/**
		 * Check if IP appears suspicious.
		 *
		 * @param string $ip IP address.
		 * @return bool True if suspicious.
		 */
		private function is_suspicious_ip( $ip ) {
			$suspicious_patterns = array(
				'0.0.0.0',
				'255.255.255.255',
				'1.1.1.1',
				'8.8.8.8',
				'127.0.0.1',
				'169.254.0.0',
				'224.0.0.0',
				'240.0.0.0',
			);

			foreach ( $suspicious_patterns as $pattern ) {
				if ( strpos( $ip, $pattern ) === 0 ) {
					return true;
				}
			}

			return false;
		}

		/**
		 * Validate IP security and select most trustworthy.
		 *
		 * @param array $candidates Array of IP candidates.
		 * @return string Most trustworthy IP address.
		 */
		private function validate_ip_security( $candidates ) {
			if ( empty( $candidates ) ) {
				return '';
			}

			usort(
				$candidates,
				function ( $a, $b ) {
					return $a['priority'] - $b['priority'];
				}
			);

			$remote_addr     = $this->get_remote_addr_ip( $candidates );
			$proxy_detection = $this->detect_proxy_environment();

			if ( ! $proxy_detection['behind_proxy'] ) {
				return $remote_addr ? $remote_addr : '';
			}

			if ( $proxy_detection['trusted_proxy'] ) {
				foreach ( $candidates as $candidate ) {
					if ( ! $candidate['spoofable'] ) {
						return $candidate['ip'];
					}
				}
			}

			return $remote_addr ? $remote_addr : $candidates[0]['ip'];
		}

		/**
		 * Get REMOTE_ADDR IP from candidates.
		 *
		 * @param array $candidates IP candidates.
		 * @return string|null REMOTE_ADDR IP or null.
		 */
		private function get_remote_addr_ip( $candidates ) {
			foreach ( $candidates as $candidate ) {
				if ( 'REMOTE_ADDR' === $candidate['source'] ) {
					return $candidate['ip'];
				}
			}
			return null;
		}

		/**
		 * Detect proxy environment.
		 *
		 * @return array Proxy detection results.
		 */
		private function detect_proxy_environment() {

			$result = array(
				'behind_proxy'  => false,
				'trusted_proxy' => false,
				'proxy_type'    => 'none',
			);

			if ( ! empty( $_SERVER['HTTP_CF_CONNECTING_IP'] ) || ! empty( $_SERVER['HTTP_CF_RAY'] ) ) {
				$result['behind_proxy']  = true;
				$result['trusted_proxy'] = true;
				$result['proxy_type']    = 'cloudflare';
				return $result;
			}

			$trusted_headers = array(
				'HTTP_CLIENT_IP',
				'HTTP_X_FORWARDED_FOR',
				'HTTP_X_REAL_IP',
			);

			foreach ( $trusted_headers as $header ) {
				if ( ! empty( $_SERVER[ $header ] ) ) {
					$result['behind_proxy'] = true;
					$remote_addr            = isset( $_SERVER['REMOTE_ADDR'] ) ? sanitize_text_field( wp_unslash( $_SERVER['REMOTE_ADDR'] ) ) : '';
					if ( $this->is_known_proxy_ip( $remote_addr ) ) {
						$result['trusted_proxy'] = true;
					}
					$result['proxy_type'] = 'generic';
					break;
				}
			}

			return $result;
		}

		/**
		 * Check if IP belongs to known proxy services.
		 *
		 * @param string $ip IP address to check.
		 * @return bool True if known proxy IP
		 */
		private function is_known_proxy_ip( $ip ) {
			if ( empty( $ip ) || ! filter_var( $ip, FILTER_VALIDATE_IP ) ) {
				return false;
			}

			// Cloudflare IP ranges (simplified check).
			$cloudflare_ranges = array(
				'173.245.48.0/20',
				'103.21.244.0/22',
				'103.22.200.0/22',
				'103.31.4.0/22',
				'141.101.64.0/18',
				'108.162.192.0/18',
				'190.93.240.0/20',
				'188.114.96.0/20',
				'197.234.240.0/22',
				'198.41.128.0/17',
				'162.158.0.0/15',
				'104.16.0.0/13',
				'104.24.0.0/14',
				'172.64.0.0/13',
				'131.0.72.0/22',
			);

			foreach ( $cloudflare_ranges as $range ) {
				if ( $this->ip_in_range( $ip, $range ) ) {
					return true;
				}
			}

			return false;
		}

		/**
		 * Check if IP is in CIDR range.
		 *
		 * @param string $ip IP to check.
		 * @param string $range CIDR range.
		 * @return bool True if IP is in range
		 */
		private function ip_in_range( $ip, $range ) {
			if ( strpos( $range, '/' ) === false ) {
				return $ip === $range;
			}

			list($subnet, $bits) = explode( '/', $range );

			if ( filter_var( $ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4 ) && filter_var( $subnet, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4 ) ) {
				$ip_long      = ip2long( $ip );
				$subnet_long  = ip2long( $subnet );
				$mask         = -1 << ( 32 - (int) $bits );
				$subnet_long &= $mask;
				return ( $ip_long & $mask ) === $subnet_long;
			}

			return false;
		}

		/**
		 * Detect IP switching attacks.
		 *
		 * @param string $email Email address.
		 * @param string $phone Phone number.
		 * @param string $browser_id Browser ID.
		 * @param string $current_ip Current IP address.
		 * @return bool True if attack detected
		 */
		private function detect_ip_switching_attack( $email, $phone, $browser_id, $current_ip ) {
			if ( empty( $current_ip ) ) {
				return false;
			}

			$tracking_key = '';
			if ( ! empty( $email ) ) {
				$tracking_key = 'email:' . $email;
			} elseif ( ! empty( $phone ) ) {
				$tracking_key = 'phone:' . $phone;
			} elseif ( ! empty( $browser_id ) ) {
				$tracking_key = 'browser:' . $browser_id;
			}

			if ( empty( $tracking_key ) ) {
				return false;
			}

			$ip_history_key = 'mo_osp_ip_history_' . md5( $tracking_key );
			$ip_history     = MoPHPSessions::get_session_var( $ip_history_key );

			if ( false === $ip_history ) {
				$ip_history = array();
			}

			$current_time = time();
			$ip_history[] = array(
				'ip'        => $current_ip,
				'timestamp' => $current_time,
			);

			$cutoff_time = $current_time - 600;
			$ip_history  = array_filter(
				$ip_history,
				function ( $entry ) use ( $cutoff_time ) {
					return $entry['timestamp'] > $cutoff_time;
				}
			);

			$unique_ips = array();
			foreach ( $ip_history as $entry ) {
				$unique_ips[ $entry['ip'] ] = true;
			}

			MoPHPSessions::add_session_var( $ip_history_key, $ip_history ); // 10 minutes

			return count( $unique_ips ) > 3;
		}

		/**
		 * Log security events.
		 *
		 * @param string $email Email address.
		 * @param string $phone Phone number.
		 * @param string $ip IP address.
		 * @param string $browser_id Browser ID.
		 * @param string $event_type Event type.
		 * @return void
		 */
		private function mosp_log_security_event( $email, $phone, $ip, $browser_id, $event_type = 'OTP_REQUEST' ) {
			if ( 'OTP_REQUEST' === $event_type ) {
				return;
			}

			$log_entry = array(
				'timestamp'  => current_time( 'mysql' ),
				'event_type' => $event_type,
				'email'      => $email ? wp_hash( $email ) : '',
				'phone'      => $phone ? wp_hash( $phone ) : '',
				'ip'         => $ip ? wp_hash( $ip ) : '',
				'browser_id' => $browser_id,
				'user_agent' => isset( $_SERVER['HTTP_USER_AGENT'] ) ? sanitize_text_field( wp_unslash( $_SERVER['HTTP_USER_AGENT'] ) ) : '', //phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized -- Sanitized within the function.
				'referer'    => isset( $_SERVER['HTTP_REFERER'] ) ? esc_url_raw( wp_unslash( $_SERVER['HTTP_REFERER'] ) ) : '', //phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized -- esc_url_raw() handles sanitization.
			);

			$log_key      = 'mo_osp_security_log';
			$existing_log = get_mo_option( $log_key );

			if ( is_string( $existing_log ) ) {
				$maybe        = maybe_unserialize( $existing_log );
				$existing_log = is_array( $maybe ) ? $maybe : array();
			} elseif ( ! is_array( $existing_log ) ) {
				$existing_log = array();
			}

			if ( count( $existing_log ) >= 100 ) {
				$existing_log = array_slice( $existing_log, -99 );
			}

			$existing_log[] = $log_entry;
			update_mo_option( $log_key, $existing_log );
		}

		/**
		 * Get browser identifier from request.
		 *
		 * @return string
		 */
		private function get_browser_id() {
			// phpcs:disable WordPress.Security.NonceVerification.Missing -- Called from OTP generation hook, no nonce available
			if ( isset( $_POST['mo_osp_browser_id'] ) ) { //phpcs:ignore WordPress.Security.NonceVerification.Missing -- Called from OTP generation hook, no nonce available
				return sanitize_text_field( wp_unslash( $_POST['mo_osp_browser_id'] ) ); //phpcs:ignore WordPress.Security.NonceVerification.Missing -- Sanitized within the function.
			}

			$user_agent = isset( $_SERVER['HTTP_USER_AGENT'] ) ? sanitize_text_field( wp_unslash( $_SERVER['HTTP_USER_AGENT'] ) ) : ''; //phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized -- Sanitized within the function.
			if ( $user_agent ) {
				return hash( 'sha256', $user_agent );
			}

			return '';
		}

		/**
		 * Create error for blocked request.
		 *
		 * @param array  $block_status Block status information.
		 * @param string $type Identifier type.
		 * @param string $identifier The identifier.
		 * @return WP_Error.
		 */
		private function create_block_error( $block_status, $type, $identifier ) {
			$masked_id = $this->storage->mosp_mask_identifier( $identifier, $type );

			switch ( $block_status['reason'] ) {
				case 'cooldown':
					$message = sprintf(
						/* translators: %1$s: masked identifier, %2$d: remaining seconds */
						__( 'Please wait %2$d seconds before requesting another OTP for %1$s.', 'miniorange-otp-verification' ),
						$masked_id,
						$block_status['remaining']
					);
					break;

				case 'max_attempts_exceeded':
					$blocked_until = date_i18n( get_mo_option( 'time_format' ), $block_status['blocked_until'] );
					$message       = sprintf(
						/* translators: %1$s: masked identifier, %2$s: time when block expires */
						MoMessages::showMessage( MoMessages::USER_IS_BLOCKED_AJAX ),
						$masked_id,
						$blocked_until
					);
					break;

				case 'temporarily_blocked':
					$blocked_until = date_i18n( get_mo_option( 'time_format' ), $block_status['blocked_until'] );
					$message       = sprintf(
						/* translators: %1$s: masked identifier, %2$s: time when block expires */
						__( 'Access temporarily blocked for %1$s. Please try again after %2$s.', 'miniorange-otp-verification' ),
						$masked_id,
						$blocked_until
					);
					break;

				default:
					$message = __( 'OTP request blocked due to spam prevention measures.', 'miniorange-otp-verification' );
			}

			return new \WP_Error( 'otp_spam_blocked', $message );
		}

		/**
		 * Check if user requires puzzle verification.
		 *
		 * @param string $email      Email address.
		 * @param string $phone      Phone number.
		 * @param string $ip         IP address.
		 * @param string $browser_id Browser fingerprint.
		 * @return bool.
		 */
		public function mosp_requires_puzzle_verification( $email, $phone, $ip, $browser_id ) {
			return $this->storage->mosp_is_puzzle_required_for_user( $email, $phone, $ip, $browser_id );
		}

		/**
		 * Clear puzzle requirement after successful verification.
		 *
		 * @param string $email      Email address.
		 * @param string $phone      Phone number.
		 * @param string $ip         IP address.
		 * @param string $browser_id Browser fingerprint.
		 * @return void.
		 */
		public function mosp_clear_puzzle_requirements( $email, $phone, $ip, $browser_id ) {
			$identifiers = array(
				'email'   => $email,
				'phone'   => $phone,
				'ip'      => $ip,
				'browser' => $browser_id,
			);

			foreach ( $identifiers as $type => $identifier ) {
				if ( ! empty( $identifier ) ) {
					$this->storage->mosp_clear_puzzle_requirement( $identifier );
				}
			}
		}

		/**
		 * Check if user has completed puzzle verification for hourly/daily limits.
		 *
		 * @param string $email Email address.
		 * @param string $phone Phone number.
		 * @return bool True if puzzle was completed
		 */
		public function mosp_has_completed_limit_puzzle( $email, $phone ) {
			$identifiers = $this->mosp_get_limit_identifiers( $email, $phone );
			if ( empty( $identifiers ) ) {
				return false;
			}

			foreach ( $identifiers as $identifier ) {
				if ( ! $this->mosp_has_completed_limit_puzzle_for_identifier( $identifier ) ) {
					return false;
				}
			}

			return true;
		}

		/**
		 * Mark that user has completed puzzle verification for hourly/daily limits.
		 *
		 * @param string $email Email address.
		 * @param string $phone Phone number.
		 */
		public function mosp_mark_limit_puzzle_completed( $email, $phone ) {
			$identifiers = $this->mosp_get_limit_identifiers( $email, $phone );
			if ( empty( $identifiers ) ) {
				return;
			}

			foreach ( $identifiers as $identifier ) {
				$puzzle_key = 'limit_puzzle_' . $this->storage->mosp_hash_key( $identifier );
				MoPHPSessions::add_session_var( $puzzle_key, 'completed' );

				$permanent_key = 'puzzle_ever_completed_' . $this->storage->mosp_hash_key( $identifier );
				update_option( $permanent_key, time() );

				MoRateLimitHelper::mosp_clear_rate_limit( $identifier, 'hourly' );
				MoRateLimitHelper::mosp_clear_rate_limit( $identifier, 'daily' );
			}

			$this->mosp_reset_immediate_spam_protection( $email, $phone );
		}

		/**
		 * Reset immediate spam protection after puzzle completion.
		 *
		 * This clears cooldown timers, attempt counts in the 15-minute window, and blocks.
		 * Note: Daily/hourly rate limits are cleared separately in mosp_mark_limit_puzzle_completed().
		 *
		 * @param string $email Email address.
		 * @param string $phone Phone number.
		 */
		public function mosp_reset_immediate_spam_protection( $email, $phone ) {
			$ip         = $this->mosp_get_client_ip();
			$browser_id = $this->get_browser_id();

			$identifiers = $this->mosp_get_all_identifiers( $email, $phone, $ip, $browser_id );

			foreach ( $identifiers as $identifier ) {
				$key  = $this->storage->mosp_hash_key( $identifier );
				$data = $this->storage->mosp_get_spam_data( $key );

				if ( false !== $data ) {
					$data['attempts']      = array();
					$data['blocked_until'] = 0;
					$data['last_attempt']  = 0;
					if ( isset( $data['block_count'] ) ) {
						$data['block_count'] = 0;
					}
					if ( isset( $data['block_reason'] ) ) {
						$data['block_reason'] = '';
					}

					$this->storage->mosp_update_spam_data( $key, $data );
				}
			}

			$this->mosp_clear_puzzle_requirements( $email, $phone, $ip, $browser_id );
		}

		/**
		 * Check if user requires puzzle verification for hourly/daily limits.
		 *
		 * @param string $email Email address.
		 * @param string $phone Phone number.
		 * @return bool True if puzzle is required
		 */
		public function mosp_requires_limit_puzzle_verification( $email, $phone ) {
			$settings    = $this->storage->mosp_get_settings();
			$identifiers = $this->mosp_get_limit_identifiers( $email, $phone );
			if ( empty( $identifiers ) ) {
				return false;
			}

			$ip          = $this->mosp_get_client_ip();
			$identifiers = $this->mosp_get_all_identifiers( $email, $phone, $ip, '' );

			foreach ( $identifiers as $identifier ) {
				$block_data = $this->storage->mosp_is_blocked( $identifier );
				if ( $block_data['blocked'] ) {
					return false;
				}
			}

			$daily_exceeded        = false;
			$hourly_exceeded       = false;
			$max_attempts_exceeded = false;

			foreach ( $identifiers as $identifier ) {
				if ( $this->mosp_has_completed_limit_puzzle_for_identifier( $identifier ) ) {
					continue;
				}
				$daily_attempts  = MoRateLimitHelper::mosp_get_daily_attempts( $identifier );
				$hourly_attempts = MoRateLimitHelper::mosp_get_hourly_attempts( $identifier );

				if ( $daily_attempts >= $settings['daily_limit'] ) {
					$daily_exceeded = true;
				}
				if ( $hourly_attempts >= $settings['hourly_limit'] ) {
					$hourly_exceeded = true;
				}
				if ( $daily_exceeded || $hourly_exceeded ) {
					break;
				}
			}

			$ip              = $this->mosp_get_client_ip();
			$all_identifiers = $this->mosp_get_all_identifiers( $email, $phone, $ip, '' );

			foreach ( $all_identifiers as $identifier ) {
				$identifier_data = $this->storage->mosp_get_spam_data( $this->storage->mosp_hash_key( $identifier ) );
				if ( false !== $identifier_data && isset( $identifier_data['attempts'] ) && is_array( $identifier_data['attempts'] ) ) {
					$time_window     = MoSecurityHelper::COUNTING_WINDOW_SECONDS; // 15 minutes
					$cutoff_time     = time() - $time_window;
					$recent_attempts = 0;

					foreach ( $identifier_data['attempts'] as $timestamp ) {
						if ( $timestamp > $cutoff_time ) {
							++$recent_attempts;
						}
					}

					if ( $recent_attempts > $settings['max_attempts'] ) {
						$max_attempts_exceeded = true;
						break;
					}
				}
			}

			$requires_puzzle = $daily_exceeded || $hourly_exceeded || $max_attempts_exceeded;

			return $requires_puzzle;
		}

		/**
		 * Check if daily OTP limit is exceeded for a user using sliding window.
		 *
		 * @param string $email Email address.
		 * @param string $phone Phone number.
		 * @param array  $settings Settings array.
		 * @param string $context Context of the check ('otp_send' or 'timer_status').
		 * @return bool True if daily limit exceeded
		 */
		private function mosp_is_daily_limit_exceeded( $email, $phone, $settings, $context = 'otp_send' ) {
			$identifiers = $this->mosp_get_limit_identifiers( $email, $phone );
			if ( empty( $identifiers ) ) {
				return false;
			}

			foreach ( $identifiers as $identifier ) {
				if ( 'otp_send' === $context && $this->mosp_has_completed_limit_puzzle_for_identifier( $identifier ) ) {
					continue;
				}
				if ( MoRateLimitHelper::mosp_is_daily_limit_exceeded( $identifier, $settings['daily_limit'] ) ) {
					return true;
				}
			}

			return false;
		}

		/**
		 * Get remaining time until daily limit resets (sliding window).
		 *
		 * @param string $email Email address.
		 * @param string $phone Phone number.
		 * @return int Remaining seconds until oldest attempt expires.
		 */
		private function mosp_get_daily_limit_reset_time( $email, $phone ) {
			$identifiers = $this->mosp_get_limit_identifiers( $email, $phone );
			if ( empty( $identifiers ) ) {
				return 0;
			}

			$max_remaining = 0;
			foreach ( $identifiers as $identifier ) {
				$remaining = MoRateLimitHelper::mosp_get_reset_time( $identifier, MoRateLimitHelper::DAILY_WINDOW, 'daily' );
				if ( $remaining > $max_remaining ) {
					$max_remaining = $remaining;
				}
			}

			return $max_remaining;
		}

		/**
		 * Get remaining time until hourly limit resets (sliding window).
		 *
		 * @param string $email Email address.
		 * @param string $phone Phone number.
		 * @return int Remaining seconds until oldest attempt expires.
		 */
		private function mosp_get_hourly_limit_reset_time( $email, $phone ) {
			$identifiers = $this->mosp_get_limit_identifiers( $email, $phone );
			if ( empty( $identifiers ) ) {
				return 0;
			}

			$max_remaining = 0;
			foreach ( $identifiers as $identifier ) {
				$remaining = MoRateLimitHelper::mosp_get_reset_time( $identifier, MoRateLimitHelper::HOURLY_WINDOW, 'hourly' );
				if ( $remaining > $max_remaining ) {
					$max_remaining = $remaining;
				}
			}

			return $max_remaining;
		}

		/**
		 * Check if hourly OTP limit is exceeded for a user using sliding window.
		 *
		 * @param string $email Email address.
		 * @param string $phone Phone number.
		 * @param array  $settings Settings array.
		 * @param string $context Context of the check ('otp_send' or 'timer_status').
		 * @return bool True if hourly limit exceeded
		 */
		private function mosp_is_hourly_limit_exceeded( $email, $phone, $settings, $context = 'otp_send' ) {
			$identifiers = $this->mosp_get_limit_identifiers( $email, $phone );
			if ( empty( $identifiers ) ) {
				return false;
			}

			foreach ( $identifiers as $identifier ) {
				if ( 'otp_send' === $context && $this->mosp_has_completed_limit_puzzle_for_identifier( $identifier ) ) {
					continue;
				}
				if ( MoRateLimitHelper::mosp_is_hourly_limit_exceeded( $identifier, $settings['hourly_limit'] ) ) {
					return true;
				}
			}

			return false;
		}

		/**
		 * Get user identifier (email or phone, whichever is available).
		 *
		 * @param string $email Email address.
		 * @param string $phone Phone number.
		 * @return string User identifier
		 */
		private function mosp_get_user_identifier( $email, $phone ) {
			if ( ! empty( $phone ) ) {
				return 'phone:' . preg_replace( '/[^0-9+]/', '', $phone );
			}
			if ( ! empty( $email ) ) {
				return 'email:' . strtolower( trim( $email ) );
			}
			return '';
		}

		/**
		 * Get identifiers used for hourly/daily limits.
		 *
		 * @param string $email Email address.
		 * @param string $phone Phone number.
		 * @return array
		 */
		private function mosp_get_limit_identifiers( $email, $phone ) {
			$settings    = $this->storage->mosp_get_settings();
			$identifiers = array();

			if ( $settings['track_phone'] && ! empty( $phone ) ) {
				$identifiers[] = 'phone:' . preg_replace( '/[^0-9+]/', '', $phone );
				return $identifiers;
			}

			if ( $settings['track_email'] && ! empty( $email ) ) {
				$identifiers[] = 'email:' . strtolower( trim( $email ) );
			}

			return $identifiers;
		}

		/**
		 * Check if user has completed limit puzzle verification for a single identifier.
		 *
		 * @param string $identifier Identifier for limit checks.
		 * @return bool
		 */
		private function mosp_has_completed_limit_puzzle_for_identifier( $identifier ) {
			if ( empty( $identifier ) ) {
				return false;
			}

			$puzzle_key = 'limit_puzzle_' . $this->storage->mosp_hash_key( $identifier );
			$completed  = MoPHPSessions::get_session_var( $puzzle_key );

			return 'completed' === $completed;
		}

		/**
		 * Record daily and hourly attempts for a user using sliding window.
		 *
		 * @param string $email Email address.
		 * @param string $phone Phone number.
		 */
		private function mosp_record_daily_hourly_attempts( $email, $phone ) {
			$identifiers = $this->mosp_get_limit_identifiers( $email, $phone );
			if ( empty( $identifiers ) ) {
				return;
			}

			foreach ( $identifiers as $identifier ) {
				MoRateLimitHelper::mosp_record_attempt_multi_window( $identifier );
			}
		}

		/**
		 * Clear hourly limit for a user (for testing purposes).
		 *
		 * Usage: Call this method via WordPress admin or add to functions.php:
		 * $handler = OSP\Handler\MoOtpSpamPreventerHandler::instance();
		 * $handler->mosp_clear_hourly_limit('test@example.com', '');
		 *
		 * Or via database:
		 * DELETE FROM wp_options WHERE option_name LIKE 'mo_customer_validation_mo_osp_rate_limit_hourly_%';
		 *
		 * @param string $email Email address.
		 * @param string $phone Phone number.
		 * @return bool True if cleared successfully.
		 */
		public function mosp_clear_hourly_limit( $email = '', $phone = '' ) {
			$identifiers = $this->mosp_get_limit_identifiers( $email, $phone );
			if ( empty( $identifiers ) ) {
				global $wpdb;
				$prefix       = 'mo_customer_validation_mo_osp_rate_limit_hourly_';
				$cache_key    = 'mosp_hourly_limit_options';
				$option_names = wp_cache_get( $cache_key, 'options' );

				if ( false === $option_names ) {
					$option_names = $wpdb->get_col( // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
						$wpdb->prepare(
							"SELECT option_name FROM {$wpdb->options} WHERE option_name LIKE %s",
							$wpdb->esc_like( $prefix ) . '%'
						)
					);
					wp_cache_set( $cache_key, $option_names, 'options' );
				}

				if ( empty( $option_names ) ) {
					return false;
				}

				foreach ( $option_names as $option_name ) {
					delete_option( $option_name );
				}

				wp_cache_delete( $cache_key, 'options' );
				return true;
			}

			$cleared = true;
			foreach ( $identifiers as $identifier ) {
				if ( ! MoRateLimitHelper::mosp_clear_rate_limit( $identifier, 'hourly' ) ) {
					$cleared = false;
				}
			}
			return $cleared;
		}
	}
}
