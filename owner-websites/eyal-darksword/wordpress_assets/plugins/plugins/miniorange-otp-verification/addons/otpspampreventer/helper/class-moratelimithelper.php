<?php
/**
 * Rate Limit Helper Class
 *
 * Implements efficient sliding window rate limiting for OTP spam prevention.
 * Uses optimized data structures and algorithms for high-performance rate limiting.
 *
 * @package otpspampreventer/helper
 */

namespace OSP\Helper;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

if ( ! class_exists( 'MoRateLimitHelper' ) ) {
	/**
	 * Rate Limit Helper Class
	 *
	 * Implements sliding window rate limiting with the following features:
	 * - True sliding window (not fixed time buckets)
	 * - Efficient memory usage with automatic cleanup
	 * - High performance with optimized data structures
	 * - Configurable time windows and limits
	 */
	class MoRateLimitHelper {

		/**
		 * Default rate limit windows (in seconds)
		 */
		const HOURLY_WINDOW = 3600;   // 1 hour
		const DAILY_WINDOW  = 86400;   // 24 hours

		/**
		 * Storage instance for rate limit data
		 *
		 * @var object
		 */
		private static $storage = null;

		/**
		 * Initialize storage instance
		 *
		 * @param object $storage_instance Storage instance.
		 */
		public static function init( $storage_instance ) {
			self::$storage = $storage_instance;
		}

		/**
		 * Check if rate limit is exceeded using sliding window
		 *
		 * This method implements a true sliding window algorithm that:
		 * 1. Maintains a sorted list of timestamps
		 * 2. Removes expired entries efficiently
		 * 3. Counts current attempts in the window
		 * 4. Compares against the limit
		 *
		 * @param string $identifier Unique identifier (email, phone, IP, etc.).
		 * @param int    $limit Maximum allowed attempts.
		 * @param int    $window_seconds Time window in seconds.
		 * @param string $window_type Type identifier (hourly, daily, etc.).
		 * @return bool True if limit is exceeded.
		 */
		public static function mosp_is_limit_exceeded( $identifier, $limit, $window_seconds, $window_type = 'custom' ) {
			if ( empty( $identifier ) || $limit <= 0 || $window_seconds <= 0 ) {
				return false;
			}

			$current_time = time();
			$window_start = $current_time - $window_seconds;

			$rate_key  = self::mosp_get_rate_limit_key( $identifier, $window_type );
			$rate_data = self::mosp_get_rate_limit_data( $rate_key );

			$current_attempts = self::cleanup_and_count_attempts( $rate_data, $window_start );

			$original_count = isset( $rate_data['attempts'] ) && is_array( $rate_data['attempts'] ) ? count( $rate_data['attempts'] ) : 0;
			if ( $original_count > $current_attempts ) {
				$rate_data['attempts'] = array_filter(
					$rate_data['attempts'],
					function ( $timestamp ) use ( $window_start ) {
						return $timestamp > $window_start;
					}
				);
				$rate_data['attempts'] = array_values( $rate_data['attempts'] );
				self::store_rate_limit_data( $rate_key, $rate_data );
			}

			$is_exceeded = $current_attempts > $limit;

			if ( $is_exceeded ) {
				MoSecurityHelper::mosp_log_security_event(
					'RATE_LIMIT_EXCEEDED',
					"Rate limit exceeded for {$window_type} window",
					array(
						'identifier'     => $identifier,
						'attempts'       => $current_attempts,
						'limit'          => $limit,
						'window_seconds' => $window_seconds,
						'window_type'    => $window_type,
					)
				);
			}

			return $is_exceeded;
		}

		/**
		 * Record an attempt in the sliding window
		 *
		 * This method efficiently adds a new timestamp to the sliding window:
		 * 1. Gets current rate limit data
		 * 2. Adds new timestamp
		 * 3. Cleans up old entries
		 * 4. Stores updated data
		 *
		 * @param string $identifier Unique identifier.
		 * @param int    $window_seconds Time window in seconds.
		 * @param string $window_type Type identifier.
		 * @return bool True if recorded successfully.
		 */
		public static function mosp_record_attempt( $identifier, $window_seconds, $window_type = 'custom' ) {
			if ( empty( $identifier ) || $window_seconds <= 0 ) {
				return false;
			}

			$current_time = time();
			$window_start = $current_time - $window_seconds;

			$rate_key  = self::mosp_get_rate_limit_key( $identifier, $window_type );
			$rate_data = self::mosp_get_rate_limit_data( $rate_key );

			$rate_data['attempts'][] = $current_time;

			$rate_data['attempts'] = array_filter(
				$rate_data['attempts'],
				function ( $timestamp ) use ( $window_start ) {
					return $timestamp > $window_start;
				}
			);

			$rate_data['attempts'] = array_values( $rate_data['attempts'] );

			$rate_data['last_attempt']   = $current_time;
			$rate_data['total_attempts'] = ( $rate_data['total_attempts'] ?? 0 ) + 1;

			return self::store_rate_limit_data( $rate_key, $rate_data );
		}

		/**
		 * Check hourly rate limit using sliding window.
		 *
		 * @param string $identifier Unique identifier.
		 * @param int    $hourly_limit Maximum attempts per hour.
		 * @return bool True if hourly limit exceeded.
		 */
		public static function mosp_is_hourly_limit_exceeded( $identifier, $hourly_limit ) {
			return self::mosp_is_limit_exceeded( $identifier, $hourly_limit, self::HOURLY_WINDOW, 'hourly' );
		}

		/**
		 * Check daily rate limit using sliding window.
		 *
		 * @param string $identifier Unique identifier.
		 * @param int    $daily_limit Maximum attempts per day.
		 * @return bool True if daily limit exceeded.
		 */
		public static function mosp_is_daily_limit_exceeded( $identifier, $daily_limit ) {
			return self::mosp_is_limit_exceeded( $identifier, $daily_limit, self::DAILY_WINDOW, 'daily' );
		}

		/**
		 * Get current hourly attempt count for an identifier.
		 *
		 * @param string $identifier The identifier to check.
		 * @return int Current number of attempts in the hourly window
		 */
		public static function mosp_get_hourly_attempts( $identifier ) {
			return self::mosp_get_attempt_count( $identifier, self::HOURLY_WINDOW, 'hourly' );
		}

		/**
		 * Get current daily attempt count for an identifier.
		 *
		 * @param string $identifier The identifier to check.
		 * @return int Current number of attempts in the daily window
		 */
		public static function mosp_get_daily_attempts( $identifier ) {
			return self::mosp_get_attempt_count( $identifier, self::DAILY_WINDOW, 'daily' );
		}

		/**
		 * Record attempt for multiple time windows efficiently.
		 *
		 * This method records an attempt across multiple time windows in a single operation
		 * for better performance when checking multiple limits (hourly + daily).
		 *
		 * @param string $identifier Unique identifier.
		 * @param array  $windows Array of window configurations.
		 * @return bool True if all recordings successful.
		 */
		public static function mosp_record_attempt_multi_window( $identifier, $windows = array() ) {
			if ( empty( $identifier ) ) {
				return false;
			}

			if ( empty( $windows ) ) {
				$windows = array(
					array(
						'seconds' => self::HOURLY_WINDOW,
						'type'    => 'hourly',
					),
					array(
						'seconds' => self::DAILY_WINDOW,
						'type'    => 'daily',
					),
				);
			}

			$success = true;
			foreach ( $windows as $window ) {
				if ( ! isset( $window['seconds'] ) || ! isset( $window['type'] ) ) {
					continue;
				}

				$result = self::mosp_record_attempt( $identifier, $window['seconds'], $window['type'] );
				if ( ! $result ) {
					$success = false;
				}
			}

			return $success;
		}

		/**
		 * Get current attempt count in sliding window.
		 *
		 * @param string $identifier Unique identifier.
		 * @param int    $window_seconds Time window in seconds.
		 * @param string $window_type Type identifier.
		 * @return int Current attempt count.
		 */
		public static function mosp_get_attempt_count( $identifier, $window_seconds, $window_type = 'custom' ) {
			if ( empty( $identifier ) || $window_seconds <= 0 ) {
				return 0;
			}

			$current_time = time();
			$window_start = $current_time - $window_seconds;

			$rate_key  = self::mosp_get_rate_limit_key( $identifier, $window_type );
			$rate_data = self::mosp_get_rate_limit_data( $rate_key );

			$attempt_count = self::cleanup_and_count_attempts( $rate_data, $window_start );

			$original_count = isset( $rate_data['attempts'] ) && is_array( $rate_data['attempts'] ) ? count( $rate_data['attempts'] ) : 0;
			if ( $original_count > $attempt_count ) {
				$rate_data['attempts'] = array_filter(
					$rate_data['attempts'],
					function ( $timestamp ) use ( $window_start ) {
						return $timestamp > $window_start;
					}
				);
				$rate_data['attempts'] = array_values( $rate_data['attempts'] );
				self::store_rate_limit_data( $rate_key, $rate_data );
			}

			return $attempt_count;
		}

		/**
		 * Get time until rate limit resets.
		 *
		 * @param string $identifier Unique identifier.
		 * @param int    $window_seconds Time window in seconds.
		 * @param string $window_type Type identifier.
		 * @return int Seconds until oldest attempt expires.
		 */
		public static function mosp_get_reset_time( $identifier, $window_seconds, $window_type = 'custom' ) {
			if ( empty( $identifier ) || $window_seconds <= 0 ) {
				return 0;
			}

			$rate_key  = self::mosp_get_rate_limit_key( $identifier, $window_type );
			$rate_data = self::mosp_get_rate_limit_data( $rate_key );

			if ( empty( $rate_data['attempts'] ) ) {
				return 0;
			}

			$now          = time();
			$window_start = $now - $window_seconds;
			$in_window    = array_filter(
				(array) ( $rate_data['attempts'] ?? array() ),
				function ( $timestamp ) use ( $window_start ) {
					return $timestamp > $window_start;
				}
			);

			if ( empty( $in_window ) ) {
				return 0;
			}

			$oldest_attempt = min( $in_window );
			$reset_time     = $oldest_attempt + $window_seconds - $now;

			return max( 0, $reset_time );
		}

		/**
		 * Clear rate limit data for identifier.
		 *
		 * @param string $identifier Unique identifier.
		 * @param string $window_type Type identifier (optional, clears all if not specified).
		 * @return bool True if cleared successfully.
		 */
		public static function mosp_clear_rate_limit( $identifier, $window_type = null ) {
			if ( empty( $identifier ) ) {
				return false;
			}

			if ( null === $window_type ) {
				$window_types = array( 'hourly', 'daily', 'weekly', 'custom' );
				$success      = true;

				foreach ( $window_types as $type ) {
					$rate_key = self::mosp_get_rate_limit_key( $identifier, $type );
					if ( ! self::delete_rate_limit_data( $rate_key ) ) {
						$success = false;
					}
				}

				return $success;
			} else {
				$rate_key = self::mosp_get_rate_limit_key( $identifier, $window_type );
				return self::delete_rate_limit_data( $rate_key );
			}
		}

		/**
		 * Generate rate limit storage key.
		 *
		 * @param string $identifier Unique identifier.
		 * @param string $window_type Type identifier.
		 * @return string Storage key.
		 */
		private static function mosp_get_rate_limit_key( $identifier, $window_type ) {
			$hashed_identifier = self::$storage ? self::$storage->mosp_hash_key( $identifier ) : md5( $identifier );
			return "rate_limit_{$window_type}_{$hashed_identifier}";
		}

		/**
		 * Get rate limit data from storage.
		 *
		 * @param string $rate_key Storage key.
		 * @return array Rate limit data.
		 */
		private static function mosp_get_rate_limit_data( $rate_key ) {
			if ( ! self::$storage ) {
				return array( 'attempts' => array() );
			}

			$data = self::$storage->mosp_get_spam_data( $rate_key );

			if ( false === $data || ! is_array( $data ) ) {
				return array( 'attempts' => array() );
			}

			if ( ! isset( $data['attempts'] ) || ! is_array( $data['attempts'] ) ) {
				$data['attempts'] = array();
			}

			return $data;
		}

		/**
		 * Store rate limit data to storage.
		 *
		 * @param string $rate_key Storage key.
		 * @param array  $rate_data Rate limit data.
		 * @return bool True if stored successfully.
		 */
		private static function store_rate_limit_data( $rate_key, $rate_data ) {
			if ( ! self::$storage ) {
				return false;
			}

			return self::$storage->mosp_update_spam_data( $rate_key, $rate_data );
		}

		/**
		 * Delete rate limit data from storage.
		 *
		 * @param string $rate_key Storage key.
		 * @return bool True if deleted successfully.
		 */
		private static function delete_rate_limit_data( $rate_key ) {
			if ( ! self::$storage ) {
				return false;
			}

			return self::$storage->mosp_delete_spam_data( $rate_key );
		}

		/**
		 * Clean expired attempts and count current attempts efficiently.
		 *
		 * @param array $rate_data Rate limit data.
		 * @param int   $window_start Window start timestamp.
		 * @return int Count of current attempts.
		 */
		private static function cleanup_and_count_attempts( $rate_data, $window_start ) {
			if ( empty( $rate_data['attempts'] ) || ! is_array( $rate_data['attempts'] ) ) {
				return 0;
			}

			$current_attempts = 0;
			foreach ( $rate_data['attempts'] as $timestamp ) {
				if ( $timestamp > $window_start ) {
					++$current_attempts;
				}
			}

			return $current_attempts;
		}
	}
}
