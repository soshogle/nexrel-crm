<?php
/**
 * Security Helper Class
 *
 * Contains all security-related validation and verification functions.
 * This class handles nonce verification, token management, and security checks.
 *
 * @package otpspampreventer/helper
 */

namespace OSP\Helper;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

use OTP\Helper\MoPHPSessions;

if ( ! class_exists( 'MoSecurityHelper' ) ) {
	/**
	 * Security Helper Class
	 *
	 * Handles all security-related operations including nonce verification,
	 * token generation, verification token management, and security validation.
	 */
	class MoSecurityHelper {

		/**
		 * Counting window for spam detection (15 minutes in seconds)
		 *
		 * This constant defines the time window used for counting attempts
		 * in spam detection algorithms. Change this value in one place to
		 * modify the counting window across the entire addon.
		 */
		const COUNTING_WINDOW_SECONDS = 900; // 15 minutes (15 * 60)

		/**
		 * Verify puzzle completion through secure server-side validation
		 *
		 * This method replaces the vulnerable $_POST['mo_osp_puzzle_processed'] check
		 * with proper server-side validation using nonces and session data.
		 *
		 * @param string $user_email Email address.
		 * @param string $phone_number Phone number.
		 * @return bool True if puzzle verification is valid and recent.
		 */
		public static function mosp_is_puzzle_verification_valid( $user_email, $phone_number ) {
			$verification_key  = self::mosp_get_puzzle_verification_key( $user_email, $phone_number );
			$verification_time = MoPHPSessions::get_session_var( $verification_key );

			if ( $verification_time && ( time() - $verification_time ) <= 300 ) {
				$used_key = $verification_key . '_used';
				if ( MoPHPSessions::get_session_var( $used_key ) ) {
					return false;
				}

				MoPHPSessions::add_session_var( $used_key, time() );

				MoPHPSessions::unset_session( $verification_key );

				return true;
			}

			$posted_verified = isset( $_POST['puzzle_verified'] ) ? sanitize_text_field( wp_unslash( $_POST['puzzle_verified'] ) ) : '';
			$posted_nonce    = isset( $_POST['mo_osp_puzzle_nonce'] ) ? sanitize_text_field( wp_unslash( $_POST['mo_osp_puzzle_nonce'] ) ) : '';
			$posted_token    = isset( $_POST['verification_token'] ) ? sanitize_text_field( wp_unslash( $_POST['verification_token'] ) ) : '';

			if ( 'true' === $posted_verified && ! empty( $posted_nonce ) && ! empty( $posted_token ) ) {
				if ( wp_verify_nonce( $posted_nonce, 'mo_osp_puzzle_verify' ) ) {
					if ( hash_equals( $verification_key, $posted_token ) ) {
						$used_key = $verification_key . '_used';
						if ( ! MoPHPSessions::get_session_var( $used_key ) ) {
							MoPHPSessions::add_session_var( $used_key, time() );
							return true;
						}
					}
				}
			}

			return false;
		}

		/**
		 * Mark puzzle verification as complete with secure server-side storage.
		 *
		 * @param string $user_email Email address.
		 * @param string $phone_number Phone number.
		 */
		public static function mosp_mark_puzzle_verification_complete( $user_email, $phone_number ) {
			$verification_key = self::mosp_get_puzzle_verification_key( $user_email, $phone_number );

			MoPHPSessions::add_session_var( $verification_key, time() );
		}

		/**
		 * Get unique puzzle verification key for user.
		 *
		 * @param string $user_email Email address.
		 * @param string $phone_number Phone number.
		 * @return string Unique verification key.
		 */
		public static function mosp_get_puzzle_verification_key( $user_email, $phone_number ) {
			$user_identifier = ! empty( $user_email ) ? $user_email : $phone_number;
			$session_id      = session_id() ? session_id() : wp_get_session_token();
			$ip              = self::mosp_get_client_ip();

			return 'mo_osp_puzzle_verified_' . md5( $user_identifier . $session_id . $ip );
		}


		/**
		 * Generate secure puzzle verification token.
		 *
		 * @param string $email Email address.
		 * @param string $phone Phone number.
		 * @return string Verification token.
		 */
		public static function mosp_generate_puzzle_verification_token( $email, $phone ) {
			$user_identifier = ! empty( $email ) ? $email : $phone;
			$session_id      = session_id() ? session_id() : wp_get_session_token();
			$ip              = self::mosp_get_client_ip();
			$timestamp       = time();

			$verification_key = 'mo_osp_puzzle_verified_' . md5( $user_identifier . $session_id . $ip );

			MoPHPSessions::add_session_var( $verification_key, $timestamp );

			return $verification_key;
		}

		/**
		 * Get client IP address with comprehensive header checking.
		 *
		 * This is the centralized IP detection method used across all helpers.
		 *
		 * @return string Client IP address.
		 */
		public static function mosp_get_client_ip() {
			$ip_headers = array(
				'HTTP_CF_CONNECTING_IP',     // Cloudflare.
				'HTTP_CLIENT_IP',            // Proxy.
				'HTTP_X_FORWARDED_FOR',      // Load balancer/proxy.
				'HTTP_X_FORWARDED',          // Proxy.
				'HTTP_X_CLUSTER_CLIENT_IP',  // Cluster.
				'HTTP_FORWARDED_FOR',        // Proxy.
				'HTTP_FORWARDED',            // Proxy.
				'REMOTE_ADDR',                // Standard.
			);

			foreach ( $ip_headers as $header ) {
				if ( ! empty( $_SERVER[ $header ] ) ) {
					$ip = sanitize_text_field( wp_unslash( $_SERVER[ $header ] ) );
					if ( strpos( $ip, ',' ) !== false ) {
						$ip = trim( explode( ',', $ip )[0] );
					}
					if ( filter_var( $ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE ) ) {
						return $ip;
					}
				}
			}

			return isset( $_SERVER['REMOTE_ADDR'] ) ? sanitize_text_field( wp_unslash( $_SERVER['REMOTE_ADDR'] ) ) : '';
		}

		/**
		 * Get client User-Agent string.
		 *
		 * This is the centralized User-Agent detection method used across all helpers.
		 *
		 * @return string Client User-Agent string.
		 */
		public static function mosp_get_user_agent() {
			return isset( $_SERVER['HTTP_USER_AGENT'] ) ? sanitize_text_field( wp_unslash( $_SERVER['HTTP_USER_AGENT'] ) ) : '';
		}

		/**
		 * Log security events with standardized format.
		 *
		 * Note: Callers should sanitize context data before passing to avoid logging sensitive information.
		 *
		 * @param string $event_type The type of security event.
		 * @param string $message The security message.
		 * @param array  $context Additional context data (should be sanitized by caller).
		 */
		public static function mosp_log_security_event( $event_type, $message, $context = array() ) {
			$log_message = 'MO_OSP: SECURITY - ' . strtoupper( $event_type ) . ' - ' . $message;

			if ( ! empty( $context ) ) {
				$log_message .= ' - Context: ' . wp_json_encode( $context );
			}

			$log_message = apply_filters( 'mo_osp_security_log_message', $log_message, $event_type, $message, $context );
		}
	}
}
