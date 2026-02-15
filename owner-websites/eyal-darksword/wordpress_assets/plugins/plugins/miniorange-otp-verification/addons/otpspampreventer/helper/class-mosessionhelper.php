<?php
/**
 * Session Helper Class
 *
 * Contains all session management and data handling functions.
 * This class provides a secure wrapper around WordPress session functionality.
 *
 * @package otpspampreventer/helper
 */

namespace OSP\Helper;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

use OTP\Helper\MoPHPSessions;

if ( ! class_exists( 'MoSessionHelper' ) ) {
	/**
	 * Session Helper Class
	 *
	 * Handles all session-related operations with security enhancements
	 * and standardized session data management.
	 */
	class MoSessionHelper {

		/**
		 * Session key prefix for OTP spam prevention
		 */
		const SESSION_PREFIX = 'mo_osp_';

		/**
		 * Default session expiry time (10 minutes)
		 */
		const DEFAULT_EXPIRY = 600;

		/**
		 * Store data in session with security metadata.
		 *
		 * @param string $key Session key (will be prefixed automatically).
		 * @param mixed  $data Data to store.
		 * @param array  $metadata Additional security metadata.
		 */
		public static function mosp_store_secure_data( $key, $data, $metadata = array() ) {
			$session_key = self::SESSION_PREFIX . $key;

			$secure_data = array(
				'data'       => $data,
				'timestamp'  => time(),
				'ip'         => MoSecurityHelper::mosp_get_client_ip(),
				'user_agent' => MoSecurityHelper::mosp_get_user_agent(),
				'metadata'   => $metadata,
			);

			MoPHPSessions::add_session_var( $session_key, $secure_data );
		}

		/**
		 * Retrieve data from session with security validation.
		 *
		 * @param string $key Session key.
		 * @param bool   $validate_security Whether to validate IP/User-Agent.
		 * @param int    $max_age Maximum age in seconds (default: 600).
		 * @return mixed|false Retrieved data or false if invalid/expired.
		 */
		public static function mosp_get_secure_data( $key, $validate_security = true, $max_age = self::DEFAULT_EXPIRY ) {
			$session_key  = self::SESSION_PREFIX . $key;
			$session_data = MoPHPSessions::get_session_var( $session_key );

			if ( ! $session_data || ! is_array( $session_data ) ) {
				return false;
			}

			if ( ! isset( $session_data['data'] ) || ! isset( $session_data['timestamp'] ) ) {
				self::mosp_clear_data( $key );
				return false;
			}

			$age = time() - $session_data['timestamp'];
			if ( $age > $max_age ) {
				self::mosp_clear_data( $key );
				return false;
			}

			if ( $validate_security ) {
				if ( ! self::validate_session_security( $session_data ) ) {
					self::mosp_clear_data( $key );
					return false;
				}
			}

			return $session_data['data'];
		}

		/**
		 * Clear data from session.
		 *
		 * @param string $key Session key.
		 */
		public static function mosp_clear_data( $key ) {
			$session_key = self::SESSION_PREFIX . $key;
			MoPHPSessions::unset_session( $session_key );
		}

		/**
		 * Check if data exists in session.
		 *
		 * @param string $key Session key.
		 * @param bool   $validate_security Whether to validate security.
		 * @param int    $max_age Maximum age in seconds.
		 * @return bool True if valid data exists.
		 */
		public static function mosp_has_data( $key, $validate_security = true, $max_age = self::DEFAULT_EXPIRY ) {
			return self::mosp_get_secure_data( $key, $validate_security, $max_age ) !== false;
		}

		/**
		 * Validate session security (IP and User-Agent)
		 *
		 * @param array $session_data Session data array.
		 * @return bool True if security validation passes.
		 */
		private static function validate_session_security( $session_data ) {
			$current_ip         = MoSecurityHelper::mosp_get_client_ip();
			$current_user_agent = MoSecurityHelper::mosp_get_user_agent();

			if ( isset( $session_data['ip'] ) && $session_data['ip'] !== $current_ip ) {
				return false;
			}

			if ( isset( $session_data['user_agent'] ) && $session_data['user_agent'] !== $current_user_agent ) {
				return false;
			}

			return true;
		}
	}
}
