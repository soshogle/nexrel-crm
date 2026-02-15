<?php
/**
 * OTP Spam Storage Handler
 *
 * @package otpspampreventer/handler
 */

namespace OSP\Handler;

use OSP\Traits\Instance;
use OSP\Helper\MoSecurityHelper;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

if ( ! class_exists( 'MoOtpSpamStorage' ) ) {
	/**
	 * The class handles storage and retrieval of spam prevention data.
	 * Uses WordPress options table to store hashed keys and attempt data.
	 */
	class MoOtpSpamStorage {

		use Instance;

		/**
		 * Option name prefix for spam data
		 */
		const SPAM_DATA_PREFIX = 'mo_osp_spam_data_';

		/**
		 * Option name for global settings
		 */
		const SETTINGS_OPTION = 'mo_osp_settings';

		/**
		 * Maximum number of entries to keep in storage
		 */
		const MAX_ENTRIES = 10000;

		/**
		 * Constructor
		 */
		public function __construct() {
			// Schedule cleanup hook.
			if ( ! wp_next_scheduled( 'mo_osp_cleanup_expired' ) ) {
				wp_schedule_event( time(), 'hourly', 'mo_osp_cleanup_expired' );
			}
			add_action( 'mo_osp_cleanup_expired', array( $this, 'mosp_cleanup_expired_entries' ) );
		}

		/**
		 * Generate a secure hash for storing identifiers.
		 *
		 * @param string $value The value to hash (phone/email/ip/browser_id).
		 * @return string
		 */
		public function mosp_hash_key( $value ) {
			return hash( 'sha256', strtolower( trim( (string) $value ) ) );
		}

		/**
		 * Get spam data for a given key.
		 *
		 * @param string $key The hashed key.
		 * @return array|false
		 */
		public function mosp_get_spam_data( $key ) {
			$option_name = self::SPAM_DATA_PREFIX . $key;
			$data        = get_mo_option( $option_name );
			if ( false === $data ) {
				return false;
			}

			if ( is_string( $data ) ) {
				$data = maybe_unserialize( $data );
			}

			if ( ! is_array( $data ) ) {
				return false;
			}

			if ( isset( $data['attempts'] ) && ! is_array( $data['attempts'] ) ) {
				$data['attempts'] = array();
			} elseif ( ! isset( $data['attempts'] ) ) {
				$data['attempts'] = array();
			}

			return $data;
		}

		/**
		 * Update spam data for a given key.
		 *
		 * @param string $key The hashed key.
		 * @param array  $data The spam data.
		 * @return bool
		 */
		public function mosp_update_spam_data( $key, $data ) {
			$option_name = self::SPAM_DATA_PREFIX . $key;

			update_mo_option( $option_name, maybe_serialize( $data ) );

			$saved_data = get_mo_option( $option_name );
			$success    = ( $saved_data === $data );

			return $success;
		}

		/**
		 * Delete spam data for a given key.
		 *
		 * @param string $key The hashed key.
		 * @return bool|void
		 */
		public function mosp_delete_spam_data( $key ) {
			$option_name = self::SPAM_DATA_PREFIX . $key;
			wp_cache_delete( $option_name, 'mo_osp' );
			return delete_mo_option( $option_name );
		}

		/**
		 * Cached settings.
		 *
		 * @var array|null
		 */
		private static $cached_settings = null;

		/**
		 * Flag to track if settings have been logged (to avoid spam in logs).
		 *
		 * @var bool
		 */
		private static $settings_logged = false;

		/**
		 * Get addon settings.
		 *
		 * @return array
		 */
		public function mosp_get_settings() {
			if ( null !== self::$cached_settings ) {
				return self::$cached_settings;
			}

			$defaults = array(
				'enabled'       => true,
				'cooldown_time' => 60,
				'max_attempts'  => 3,
				'block_time'    => 3600,
				'daily_limit'   => 10,
				'hourly_limit'  => 5,
				'track_phone'   => true,
				'track_email'   => true,
				'track_ip'      => true,
				'track_browser' => true,
				'whitelist_ips' => array(),
			);

			$settings = get_mo_option( self::SETTINGS_OPTION );

			if ( false === $settings || ! is_array( $settings ) ) {
				$settings = $defaults;
			} else {
				$settings = wp_parse_args( $settings, $defaults );

				if ( isset( $settings['whitelist_ips'] ) && is_string( $settings['whitelist_ips'] ) ) {
					if ( ! empty( $settings['whitelist_ips'] ) ) {
						$split_by_newline = array_filter( array_map( 'trim', explode( "\n", $settings['whitelist_ips'] ) ) );
						if ( count( $split_by_newline ) === 1 && strpos( $split_by_newline[0], ' ' ) !== false ) {
							$settings['whitelist_ips'] = array_filter( array_map( 'trim', explode( ' ', $settings['whitelist_ips'] ) ) );
						} else {
							$settings['whitelist_ips'] = $split_by_newline;
						}
						$settings['whitelist_ips'] = array_values( $settings['whitelist_ips'] );
					} else {
						$settings['whitelist_ips'] = array();
					}
				} elseif ( isset( $settings['whitelist_ips'] ) && is_array( $settings['whitelist_ips'] ) ) {
					$cleaned_ips = array();
					foreach ( $settings['whitelist_ips'] as $ip_item ) {
						$ip_item = trim( $ip_item );
						if ( empty( $ip_item ) ) {
							continue;
						}
						if ( strpos( $ip_item, ' ' ) !== false ) {
							$split_ips   = array_filter( array_map( 'trim', explode( ' ', $ip_item ) ) );
							$cleaned_ips = array_merge( $cleaned_ips, $split_ips );
						} else {
							$cleaned_ips[] = $ip_item;
						}
					}
					$settings['whitelist_ips'] = array_values( array_unique( $cleaned_ips ) );
				} elseif ( ! isset( $settings['whitelist_ips'] ) || ! is_array( $settings['whitelist_ips'] ) ) {
					$settings['whitelist_ips'] = array();
				}
			}

			self::$cached_settings = $settings;

			if ( ! self::$settings_logged ) {
				self::$settings_logged = true;
			}

			return $settings;
		}

		/**
		 * Update addon settings.
		 *
		 * @param array $settings The settings array.
		 * @return bool
		 */
		public function mosp_update_settings( $settings ) {
			update_mo_option( self::SETTINGS_OPTION, $settings );

			self::$cached_settings = null;

			$saved_settings = get_mo_option( self::SETTINGS_OPTION );
			$success        = ( $saved_settings === $settings );

			return $success;
		}

		/**
		 * Record an OTP attempt.
		 *
		 * @param string $identifier The identifier (phone/email/ip/browser).
		 * @param string $type The type of identifier.
		 * @return array The updated attempt data.
		 */
		public function mosp_record_attempt( $identifier, $type ) {
			$key  = $this->mosp_hash_key( $identifier );
			$data = $this->mosp_get_spam_data( $key );
			$now  = time();

			if ( false === $data ) {
				$data = array(
					'type'          => $type,
					'attempts'      => array(),
					'blocked_until' => 0,
					'total_blocks'  => 0,
					'created'       => $now,
					'last_attempt'  => $now,
				);
			}

			$attempts_before = isset( $data['attempts'] ) && is_array( $data['attempts'] ) ? count( $data['attempts'] ) : 0;

			$data['attempts'][]   = $now;
			$data['last_attempt'] = $now;

			$settings    = $this->mosp_get_settings();
			$time_window = MoSecurityHelper::COUNTING_WINDOW_SECONDS;
			$cutoff_time = $now - $time_window;

			$data['attempts'] = array_filter(
				$data['attempts'],
				function ( $timestamp ) use ( $cutoff_time ) {
					return $timestamp > $cutoff_time;
				}
			);

			$data['attempts'] = array_values( $data['attempts'] );

			$attempts_after = isset( $data['attempts'] ) && is_array( $data['attempts'] ) ? count( $data['attempts'] ) : 0;

			$this->mosp_update_spam_data( $key, $data );

			return $data;
		}

		/**
		 * Check if an identifier is blocked.
		 *
		 * @param string $identifier The identifier to check.
		 * @return array Block status information.
		 */
		public function mosp_is_blocked( $identifier ) {
			$key      = $this->mosp_hash_key( $identifier );
			$data     = $this->mosp_get_spam_data( $key );
			$settings = $this->mosp_get_settings();
			$now      = time();

			if ( false === $data ) {
				return array(
					'blocked'       => false,
					'reason'        => '',
					'blocked_until' => 0,
					'attempts'      => 0,
				);
			}

			if ( isset( $data['blocked_until'] ) && $data['blocked_until'] > 0 && $data['blocked_until'] <= $now ) {
				$block_reason = isset( $data['block_reason'] ) ? $data['block_reason'] : 'unknown';

				if ( 'max_attempts_exceeded' === $block_reason ) {

					if ( strpos( $identifier, ':' ) !== false ) {
						list( $id_type, $id_value ) = explode( ':', $identifier, 2 );
						$this->mosp_mark_puzzle_required( $id_value );
					} else {
						$this->mosp_mark_puzzle_required( $identifier );
					}
					$attempts_before_clear = isset( $data['attempts'] ) && is_array( $data['attempts'] ) ? count( $data['attempts'] ) : 0;
					$data['attempts']      = array();
				} else {
					$time_window = MoSecurityHelper::COUNTING_WINDOW_SECONDS;
					$cutoff_time = $now - $time_window;

					$attempts_before_clean = isset( $data['attempts'] ) && is_array( $data['attempts'] ) ? count( $data['attempts'] ) : 0;

					if ( isset( $data['attempts'] ) && is_array( $data['attempts'] ) ) {
						$data['attempts'] = array_filter(
							$data['attempts'],
							function ( $timestamp ) use ( $cutoff_time ) {
								return $timestamp > $cutoff_time;
							}
						);
						$data['attempts'] = array_values( $data['attempts'] );
					}

					$attempts_after_clean = isset( $data['attempts'] ) && is_array( $data['attempts'] ) ? count( $data['attempts'] ) : 0;
				}

				$data['blocked_until'] = 0;
				$data['block_reason']  = '';

				$this->mosp_update_spam_data( $this->mosp_hash_key( $identifier ), $data );
			}

			if ( 0 === $data['blocked_until'] && isset( $data['block_count'] ) && $data['block_count'] > 0 ) {
				if ( strpos( $identifier, ':' ) !== false ) {
					list( $id_type, $id_value ) = explode( ':', $identifier, 2 );
					$existing_puzzle            = $this->mosp_is_puzzle_required( $id_value );
				} else {
					$existing_puzzle = $this->mosp_is_puzzle_required( $identifier );
				}

				if ( ! $existing_puzzle ) {
					if ( strpos( $identifier, ':' ) !== false ) {
						list( $id_type, $id_value ) = explode( ':', $identifier, 2 );
						$this->mosp_mark_puzzle_required( $id_value );
					} else {
						$this->mosp_mark_puzzle_required( $identifier );
					}
				}
			}

			if ( $data['blocked_until'] > $now ) {
				$remaining    = $data['blocked_until'] - $now;
				$block_reason = isset( $data['block_reason'] ) && ! empty( $data['block_reason'] ) ? $data['block_reason'] : 'temporarily_blocked';
				return array(
					'blocked'       => true,
					'reason'        => $block_reason,
					'blocked_until' => $data['blocked_until'],
					'attempts'      => isset( $data['attempts'] ) && is_array( $data['attempts'] ) ? count( $data['attempts'] ) : 0,
				);
			}

			$cooldown_time = $settings['cooldown_time'];
			$attempts      = isset( $data['attempts'] ) ? $data['attempts'] : array();

			$previous_attempt = null;
			if ( count( $attempts ) >= 2 ) {
				$sorted_attempts = $attempts;
				rsort( $sorted_attempts );
				$most_recent_attempt    = $sorted_attempts[0];
				$second_to_last_attempt = $sorted_attempts[1];

				$time_between_attempts = $most_recent_attempt - $second_to_last_attempt;

				if ( $time_between_attempts < $cooldown_time ) {
					$previous_attempt = $second_to_last_attempt;
				}
			}

			if ( $previous_attempt && ( $now - $previous_attempt ) < $cooldown_time ) {
				$time_since_previous = $now - $previous_attempt;

				$calculated_blocked_until = $previous_attempt + $cooldown_time;

				if ( ! isset( $data['blocked_until'] ) || $data['blocked_until'] !== $calculated_blocked_until ) {
					if ( $calculated_blocked_until > $now ) {
						$data['blocked_until'] = $calculated_blocked_until;
						$data['block_reason']  = 'cooldown';
						$this->mosp_update_spam_data( $key, $data );
					}
				}

				$blocked_until = isset( $data['blocked_until'] ) && $data['blocked_until'] > $now ? $data['blocked_until'] : $calculated_blocked_until;
				$remaining     = $blocked_until - $now;

				return array(
					'blocked'       => true,
					'reason'        => 'cooldown',
					'blocked_until' => $blocked_until,
					'attempts'      => isset( $data['attempts'] ) && is_array( $data['attempts'] ) ? count( $data['attempts'] ) : 0,
					'remaining'     => $remaining,
				);
			} elseif ( $previous_attempt ) {
					$time_since_previous = $now - $previous_attempt;
			}

			$time_window      = MoSecurityHelper::COUNTING_WINDOW_SECONDS;
			$cutoff_time      = $now - $time_window;
			$data['attempts'] = array_filter(
				$data['attempts'],
				function ( $timestamp ) use ( $cutoff_time ) {
					return $timestamp > $cutoff_time;
				}
			);

			$max_attempts   = $settings['max_attempts'];
			$attempts_count = isset( $data['attempts'] ) && is_array( $data['attempts'] ) ? count( $data['attempts'] ) : 0;

			if ( $attempts_count > $max_attempts ) {
				$block_time_seconds    = $settings['block_time'];
				$data['blocked_until'] = $now + $block_time_seconds;
				$data['block_reason']  = 'max_attempts_exceeded';
				if ( ! isset( $data['total_blocks'] ) ) {
					$data['total_blocks'] = 0;
				}
				++$data['total_blocks'];
				$this->mosp_update_spam_data( $key, $data );

				return array(
					'blocked'       => true,
					'reason'        => 'max_attempts_exceeded',
					'blocked_until' => $data['blocked_until'],
					'attempts'      => $attempts_count,
				);
			}

			return array(
				'blocked'       => false,
				'reason'        => '',
				'blocked_until' => 0,
				'attempts'      => isset( $data['attempts'] ) && is_array( $data['attempts'] ) ? count( $data['attempts'] ) : 0,
			);
		}

		/**
		 * Check if identifier is whitelisted.
		 *
		 * @param string $identifier The identifier to check.
		 * @param string $type The type of identifier.
		 * @return bool
		 */
		public function mosp_is_whitelisted( $identifier, $type ) {
			$settings = $this->mosp_get_settings();

			switch ( $type ) {
				case 'ip':
					$identifier = trim( $identifier );

					if ( empty( $identifier ) || ! filter_var( $identifier, FILTER_VALIDATE_IP ) ) {
						return false;
					}

					$raw_whitelist = isset( $settings['whitelist_ips'] ) ? $settings['whitelist_ips'] : array();

					if ( is_string( $raw_whitelist ) ) {
						if ( ! empty( $raw_whitelist ) ) {
							$raw_whitelist = array_filter( array_map( 'trim', explode( "\n", $raw_whitelist ) ) );
							$raw_whitelist = array_values( $raw_whitelist );
						} else {
							$raw_whitelist = array();
						}
					}

					if ( ! empty( $raw_whitelist ) && is_array( $raw_whitelist ) ) {
						$whitelist_ips = array_map( 'trim', $raw_whitelist );
						$whitelist_ips = array_filter( $whitelist_ips );
						$whitelist_ips = array_values( $whitelist_ips );
					} else {
						$whitelist_ips = array();
					}

					foreach ( $whitelist_ips as $whitelist_ip ) {
						$whitelist_ip = trim( $whitelist_ip );
						if ( empty( $whitelist_ip ) ) {
							continue;
						}

						if ( $identifier === $whitelist_ip ) {
							return true;
						}

						if ( strpos( $whitelist_ip, '/' ) !== false ) {
							if ( $this->mosp_ip_in_range( $identifier, $whitelist_ip ) ) {
								return true;
							}
							continue;
						}

						$identifier_is_ipv6 = filter_var( $identifier, FILTER_VALIDATE_IP, FILTER_FLAG_IPV6 );
						$whitelist_is_ipv6  = filter_var( $whitelist_ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV6 );

						if ( $identifier_is_ipv6 && $whitelist_is_ipv6 ) {
							$normalized_identifier = $this->mosp_normalize_ipv6( $identifier );
							$normalized_whitelist  = $this->mosp_normalize_ipv6( $whitelist_ip );
							if ( $normalized_identifier === $normalized_whitelist ) {
								return true;
							}
						}

						$identifier_is_ipv4 = filter_var( $identifier, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4 );
						$whitelist_is_ipv4  = filter_var( $whitelist_ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4 );

						if ( $identifier_is_ipv4 && $whitelist_is_ipv4 ) {
							if ( $identifier === $whitelist_ip ) {
								return true;
							}
						}
					}
					return false;
				default:
					return false;
			}
		}

		/**
		 * Normalize IPv6 address to canonical form.
		 *
		 * @param string $ip IPv6 address.
		 * @return string Normalized IPv6 address or original IP if not IPv6.
		 */
		private function mosp_normalize_ipv6( $ip ) {
			if ( ! filter_var( $ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV6 ) ) {
				return $ip;
			}

			if ( function_exists( 'inet_pton' ) && function_exists( 'inet_ntop' ) ) {
				$packed = inet_pton( $ip );
				if ( false !== $packed ) {
					$normalized = inet_ntop( $packed );
					if ( false !== $normalized ) {
						return strtolower( $normalized );
					}
				}
			}

			return strtolower( $ip );
		}

		/**
		 * Check if IP is in CIDR range (supports both IPv4 and IPv6).
		 *
		 * @param string $ip IP address to check.
		 * @param string $range CIDR range (e.g., "192.168.1.0/24" or "2001:db8::/32").
		 * @return bool True if IP is in range.
		 */
		private function mosp_ip_in_range( $ip, $range ) {
			if ( strpos( $range, '/' ) === false ) {
				return $ip === $range;
			}

			list( $subnet, $bits ) = explode( '/', $range );
			$bits                  = (int) $bits;

			if ( ! filter_var( $ip, FILTER_VALIDATE_IP ) || ! filter_var( $subnet, FILTER_VALIDATE_IP ) ) {
				return false;
			}

			if ( filter_var( $ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4 ) && filter_var( $subnet, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4 ) ) {
				if ( $bits < 0 || $bits > 32 ) {
					return false;
				}
				$ip_long     = ip2long( $ip );
				$subnet_long = ip2long( $subnet );
				if ( false === $ip_long || false === $subnet_long ) {
					return false;
				}
				$mask         = -1 << ( 32 - $bits );
				$subnet_long &= $mask;
				return ( $ip_long & $mask ) === $subnet_long;
			}

			if ( filter_var( $ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV6 ) && filter_var( $subnet, FILTER_VALIDATE_IP, FILTER_FLAG_IPV6 ) ) {
				if ( $bits < 0 || $bits > 128 ) {
					return false;
				}
				if ( function_exists( 'inet_pton' ) ) {
					$ip_packed     = inet_pton( $ip );
					$subnet_packed = inet_pton( $subnet );
					if ( false === $ip_packed || false === $subnet_packed ) {
						return false;
					}

					$ip_bytes     = unpack( 'C*', $ip_packed );
					$subnet_bytes = unpack( 'C*', $subnet_packed );

					$full_bytes   = intval( $bits / 8 );
					$partial_bits = $bits % 8;

					for ( $i = 1; $i <= $full_bytes; $i++ ) {
						if ( ! isset( $ip_bytes[ $i ] ) || ! isset( $subnet_bytes[ $i ] ) ) {
							return false;
						}
						if ( $ip_bytes[ $i ] !== $subnet_bytes[ $i ] ) {
							return false;
						}
					}

					if ( $partial_bits > 0 && $full_bytes < 16 ) {
						$byte_index = $full_bytes + 1;
						if ( ! isset( $ip_bytes[ $byte_index ] ) || ! isset( $subnet_bytes[ $byte_index ] ) ) {
							return false;
						}
						$mask = 0xFF << ( 8 - $partial_bits );
						if ( ( $ip_bytes[ $byte_index ] & $mask ) !== ( $subnet_bytes[ $byte_index ] & $mask ) ) {
							return false;
						}
					}

					return true;
				} else {
					$normalized_ip     = $this->mosp_normalize_ipv6( $ip );
					$normalized_subnet = $this->mosp_normalize_ipv6( $subnet );
					if ( 128 === $bits ) {
						return $normalized_ip === $normalized_subnet;
					}
					return false;
				}
			}

			return false;
		}

		/**
		 * Mark an identifier as requiring puzzle verification.
		 *
		 * @param string $identifier The identifier to mark.
		 * @return bool
		 */
		public function mosp_mark_puzzle_required( $identifier ) {
			$key          = 'mo_osp_puzzle_' . $this->mosp_hash_key( $identifier );
			$current_time = time();
			$expiry       = $current_time + ( 24 * 60 * 60 ); // 24 hours.

			$result = update_option( $key, $expiry );

			return $result;
		}

		/**
		 * Check if an identifier requires puzzle verification.
		 *
		 * @param string $identifier The identifier to check.
		 * @return bool
		 */
		public function mosp_is_puzzle_required( $identifier ) {
			$key          = 'mo_osp_puzzle_' . $this->mosp_hash_key( $identifier );
			$expiry       = get_option( $key );
			$current_time = time();

			if ( false === $expiry ) {
				$expiry = 0;
			}

			$required = ( $expiry && $expiry > $current_time );
			if ( $required ) {
				$remaining_time = $expiry - $current_time;
			}

			if ( $required ) {
				$remaining_time = $expiry - $current_time;
				return true;
			}

			if ( $expiry ) {
				delete_option( $key );
			}

			return false;
		}

		/**
		 * Clear puzzle requirement for an identifier.
		 *
		 * @param string $identifier The identifier to clear.
		 * @return bool
		 */
		public function mosp_clear_puzzle_requirement( $identifier ) {
			$key    = 'mo_osp_puzzle_' . $this->mosp_hash_key( $identifier );
			$result = delete_option( $key );
			return $result;
		}

		/**
		 * Check if user requires puzzle verification for any identifier.
		 *
		 * @param string $email      Email address.
		 * @param string $phone      Phone number.
		 * @param string $ip         IP address.
		 * @param string $browser_id Browser fingerprint.
		 * @return bool
		 */
		public function mosp_is_puzzle_required_for_user( $email, $phone, $ip, $browser_id ) {
			$identifiers = array(
				'email'   => $email,
				'phone'   => $phone,
				'ip'      => $ip,
				'browser' => $browser_id,
			);

			$prefixed_identifiers = array();
			if ( ! empty( $email ) ) {
				$prefixed_identifiers[] = 'email:' . $email;
			}
			if ( ! empty( $phone ) ) {
				$prefixed_identifiers[] = 'phone:' . $phone;
			}
			if ( ! empty( $ip ) ) {
				$prefixed_identifiers[] = 'ip:' . $ip;
			}
			if ( ! empty( $browser_id ) ) {
				$prefixed_identifiers[] = 'browser:' . $browser_id;
			}

			if ( empty( $email ) && empty( $phone ) && empty( $ip ) && empty( $browser_id ) ) {
				return false;
			}

			foreach ( $identifiers as $type => $identifier ) {
				if ( ! empty( $identifier ) ) {
					$required = $this->mosp_is_puzzle_required( $identifier );
					if ( $required ) {
						return true;
					}
				}
			}

			foreach ( $prefixed_identifiers as $prefixed_id ) {
				$required = $this->mosp_is_puzzle_required( $prefixed_id );
				if ( $required ) {
					return true;
				}
			}

			return false;
		}

		/**
		 * Cleanup expired entries.
		 */
		public function mosp_cleanup_expired_entries() {
			global $wpdb;

			$settings = $this->mosp_get_settings();
			$now      = time();
			$cutoff   = $now - ( MoSecurityHelper::COUNTING_WINDOW_SECONDS * 2 ); // Keep data for 2x counting window (30 minutes).

			$deleted = $this->cleanup_spam_data( $cutoff );

			$deleted += $this->cleanup_rate_limiting_data( $now );

			$deleted += $this->cleanup_permanent_puzzle_flags( $now - ( 30 * 24 * 60 * 60 ) );

			$this->mosp_prune_if_needed();
		}

		/**
		 * Cleanup main spam data entries.
		 *
		 * @param int $cutoff Cutoff timestamp.
		 * @return int Number of deleted entries.
		 */
		private function cleanup_spam_data( $cutoff ) {
			global $wpdb;

			$cache_key    = 'mosp_spam_data_option_names';
			$option_names = wp_cache_get( $cache_key, 'mo_osp' );
			if ( false === $option_names ) {
				$option_names = $wpdb->get_col( // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
					$wpdb->prepare(
						"SELECT option_name FROM {$wpdb->options} WHERE option_name LIKE %s",
						$wpdb->esc_like( 'mo_customer_validation_' . self::SPAM_DATA_PREFIX ) . '%'
					)
				);
				wp_cache_set( $cache_key, $option_names, 'mo_osp' );
			}

			$deleted = 0;
			foreach ( $option_names as $db_option_name ) {
				$option_key = str_replace( 'mo_customer_validation_', '', $db_option_name );

				$data = get_mo_option( $option_key );

				if ( is_array( $data ) ) {
					if ( isset( $data['last_attempt'] ) && $data['last_attempt'] < $cutoff &&
						( ! isset( $data['blocked_until'] ) || $data['blocked_until'] < time() ) ) {
						delete_mo_option( $option_key );
						wp_cache_delete( $db_option_name, 'mo_osp' );
						++$deleted;
					}
				}
			}

			if ( $deleted > 0 ) {
				wp_cache_delete( $cache_key, 'mo_osp' );
			}

			return $deleted;
		}

		/**
		 * Cleanup rate limiting data (hourly/daily).
		 *
		 * @param int $now Current timestamp.
		 * @return int Number of deleted entries
		 */
		private function cleanup_rate_limiting_data( $now ) {
			global $wpdb;

			$deleted = 0;

			$hourly_cutoff  = $now - ( 2 * 60 * 60 );
			$hourly_cache   = 'mosp_rate_limit_hourly_option_names';
			$hourly_options = wp_cache_get( $hourly_cache, 'mo_osp' );
			if ( false === $hourly_options ) {
				$hourly_options = $wpdb->get_col( // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
					$wpdb->prepare(
						"SELECT option_name FROM {$wpdb->options} WHERE option_name LIKE %s",
						$wpdb->esc_like( 'mo_customer_validation_mo_osp_rate_limit_hourly_' ) . '%'
					)
				);
				wp_cache_set( $hourly_cache, $hourly_options, 'mo_osp' );
			}

			foreach ( $hourly_options as $db_option_name ) {
				$option_key = str_replace( 'mo_customer_validation_', '', $db_option_name );

				$data = get_mo_option( $option_key );
				if ( is_array( $data ) && isset( $data['last_attempt'] ) && $data['last_attempt'] < $hourly_cutoff ) {
					delete_mo_option( $option_key );
					++$deleted;
				}
			}

			$daily_cutoff  = $now - ( 2 * 24 * 60 * 60 );
			$daily_cache   = 'mosp_rate_limit_daily_option_names';
			$daily_options = wp_cache_get( $daily_cache, 'mo_osp' );
			if ( false === $daily_options ) {
				$daily_options = $wpdb->get_col( // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
					$wpdb->prepare(
						"SELECT option_name FROM {$wpdb->options} WHERE option_name LIKE %s",
						$wpdb->esc_like( 'mo_customer_validation_mo_osp_rate_limit_daily_' ) . '%'
					)
				);
				wp_cache_set( $daily_cache, $daily_options, 'mo_osp' );
			}

			foreach ( $daily_options as $db_option_name ) {
				$option_key = str_replace( 'mo_customer_validation_', '', $db_option_name );

				$data = get_mo_option( $option_key );
				if ( is_array( $data ) && isset( $data['last_attempt'] ) && $data['last_attempt'] < $daily_cutoff ) {
					delete_mo_option( $option_key );
					++$deleted;
				}
			}

			if ( $deleted > 0 ) {
				wp_cache_delete( $hourly_cache, 'mo_osp' );
				wp_cache_delete( $daily_cache, 'mo_osp' );
			}

			return $deleted;
		}

		/**
		 * Cleanup permanent puzzle completion flags.
		 *
		 * @param int $cutoff Cutoff timestamp (30 days ago).
		 * @return int Number of deleted entries
		 */
		private function cleanup_permanent_puzzle_flags( $cutoff ) {
			global $wpdb;

			$deleted        = 0;
			$cache_key      = 'mosp_puzzle_completion_option_names';
			$puzzle_options = wp_cache_get( $cache_key, 'mo_osp' );
			if ( false === $puzzle_options ) {
				$puzzle_options = $wpdb->get_col( // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
					$wpdb->prepare(
						"SELECT option_name FROM {$wpdb->options} WHERE option_name LIKE %s",
						$wpdb->esc_like( 'mo_customer_validation_puzzle_ever_completed_' ) . '%'
					)
				);
				wp_cache_set( $cache_key, $puzzle_options, 'mo_osp' );
			}

			foreach ( $puzzle_options as $db_option_name ) {
				$option_key = str_replace( 'mo_customer_validation_', '', $db_option_name );

				$completion_time = get_mo_option( $option_key );
				if ( is_numeric( $completion_time ) && $completion_time < $cutoff ) {
					delete_mo_option( $option_key );
					++$deleted;
				}
			}

			if ( $deleted > 0 ) {
				wp_cache_delete( $cache_key, 'mo_osp' );
			}

			return $deleted;
		}

		/**
		 * Prune entries if still too many.
		 */
		private function mosp_prune_if_needed() {
			global $wpdb;

			$cache_key     = 'mosp_spam_storage_total_count';
			$total_options = wp_cache_get( $cache_key, 'mo_osp' );
			if ( false === $total_options ) {
				$total_options = $wpdb->get_var( // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
					$wpdb->prepare(
						"SELECT COUNT(*) FROM {$wpdb->options} WHERE option_name LIKE %s OR option_name LIKE %s OR option_name LIKE %s",
						$wpdb->esc_like( 'mo_customer_validation_' . self::SPAM_DATA_PREFIX ) . '%',
						$wpdb->esc_like( 'mo_customer_validation_mo_osp_rate_limit_' ) . '%',
						$wpdb->esc_like( 'mo_customer_validation_puzzle_ever_completed_' ) . '%'
					)
				);
				wp_cache_set( $cache_key, $total_options, 'mo_osp' );
			}

			if ( $total_options > self::MAX_ENTRIES ) {
				$this->mosp_prune_old_entries( self::MAX_ENTRIES );
				wp_cache_delete( $cache_key, 'mo_osp' );
			}
		}

		/**
		 * Prune old entries to keep storage bounded.
		 *
		 * @param int $max_entries Maximum entries to keep.
		 * @return void
		 */
		private function mosp_prune_old_entries( $max_entries ) {
			global $wpdb;

			$cache_key = 'mosp_spam_data_entries';
			$results   = wp_cache_get( $cache_key, 'mo_osp' );
			if ( false === $results ) {
				$results = $wpdb->get_results( // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
					$wpdb->prepare(
						"SELECT option_name, option_value FROM {$wpdb->options} WHERE option_name LIKE %s ORDER BY option_id DESC",
						$wpdb->esc_like( 'mo_customer_validation_' . self::SPAM_DATA_PREFIX ) . '%'
					)
				);
				wp_cache_set( $cache_key, $results, 'mo_osp' );
			}

			if ( count( $results ) <= $max_entries ) {
				return;
			}

			$entries = array();
			foreach ( $results as $result ) {
				$data = maybe_unserialize( $result->option_value );
				if ( is_array( $data ) && isset( $data['last_attempt'] ) ) {
					$entries[] = array(
						'option_name'  => $result->option_name,
						'last_attempt' => $data['last_attempt'],
					);
				}
			}

			usort(
				$entries,
				function ( $a, $b ) {
					return $b['last_attempt'] - $a['last_attempt'];
				}
			);

			$to_delete = array_slice( $entries, $max_entries );
			foreach ( $to_delete as $entry ) {
				$option_key = str_replace( 'mo_customer_validation_', '', $entry['option_name'] );

				delete_mo_option( $option_key );
				wp_cache_delete( $entry['option_name'], 'mo_osp' );
			}

			wp_cache_delete( $cache_key, 'mo_osp' );
		}

		/**
		 * Get masked version of identifier for logging.
		 *
		 * @param string $identifier The identifier to mask.
		 * @param string $type The type of identifier.
		 * @return string
		 */
		public function mosp_mask_identifier( $identifier, $type ) {
			switch ( $type ) {
				case 'phone':
					if ( strlen( $identifier ) > 4 ) {
						return str_repeat( 'X', strlen( $identifier ) - 4 ) . substr( $identifier, -4 );
					}
					return $identifier;

				case 'email':
					$parts = explode( '@', $identifier );
					if ( count( $parts ) === 2 ) {
						$username        = $parts[0];
						$domain          = $parts[1];
						$masked_username = strlen( $username ) > 2 ? substr( $username, 0, 1 ) . str_repeat( '*', strlen( $username ) - 2 ) . substr( $username, -1 ) : $username;
						return $masked_username . '@' . $domain;
					}
					return $identifier;

				case 'ip':
					$parts = explode( '.', $identifier );
					if ( count( $parts ) === 4 ) {
						return $parts[0] . '.' . $parts[1] . '.XXX.XXX';
					}
					return $identifier;

				default:
					return substr( $identifier, 0, 8 ) . '...';
			}
		}

		/**
		 * Record attempt with timestamp (new method for integration).
		 *
		 * @param string $identifier The full identifier (e.g., 'email:user@example.com').
		 * @param int    $timestamp The attempt timestamp.
		 * @return void
		 */
		public function mosp_record_attempt_with_timestamp( $identifier, $timestamp ) {
			$key  = $this->mosp_hash_key( $identifier );
			$data = $this->mosp_get_spam_data( $key );

			if ( false === $data ) {
				$data = array(
					'attempts'      => array(),
					'blocked_until' => 0,
					'created'       => $timestamp,
				);
			}

			if ( ! isset( $data['attempts'] ) ) {
				$data['attempts'] = array();
			}

			$data['attempts'][]   = $timestamp;
			$data['last_attempt'] = $timestamp;

			$cutoff           = $timestamp - ( 24 * 60 * 60 );
			$data['attempts'] = array_filter(
				$data['attempts'],
				function ( $time ) use ( $cutoff ) {
					return $time > $cutoff;
				}
			);

			$this->mosp_update_spam_data( $key, $data );
		}
	}
}
