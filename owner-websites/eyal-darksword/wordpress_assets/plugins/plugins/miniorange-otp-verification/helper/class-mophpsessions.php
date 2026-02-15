<?php
/**
 * Load administrator changes for MoPHPSessions
 *
 * @package miniorange-otp-verification/helper
 */

namespace OTP\Helper;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

use OTP\Objects\IMoSessions;

/** TODO: Need to move each session type to different files */
if ( ! class_exists( 'MoPHPSessions' ) ) {
	/**
	 * Class for managing different types of session storage mechanisms.
	 *
	 * Implements the IMoSessions interface to provide consistent session handling
	 * across different storage types: PHP sessions, cookies, cache and transients.
	 */
	class MoPHPSessions implements IMoSessions {

		/**
		 * Sets session values based on the configured session type.
		 *
		 * @param string $key Key to store data under.
		 * @param mixed  $val Value to store.
		 * @return void
		 */
		public static function add_session_var( $key, $val ) {
			if ( empty( $key ) ) {
				return;
			}
			switch ( MOV_SESSION_TYPE ) {
				case 'COOKIE':
					$cookie_val = wp_json_encode( $val, JSON_UNESCAPED_SLASHES );
					setcookie( $key, $cookie_val, time() + 12 * HOUR_IN_SECONDS, COOKIEPATH, COOKIE_DOMAIN, is_ssl(), true );
					break;
				case 'SESSION':
					self::check_session();
					$_SESSION[ $key ] = maybe_serialize( $val );
					break;
				case 'CACHE':
					if ( ! wp_cache_add( $key, maybe_serialize( $val ) ) ) {
						wp_cache_replace( $key, maybe_serialize( $val ) );
					}
					break;
				case 'TRANSIENT':
					if ( empty( $_COOKIE['transient_key'] ) ) {
						$transient_key = wp_generate_password( 32, false );
						if ( headers_sent() ) {
							return;
						}
						setcookie( 'transient_key', $transient_key, time() + 12 * HOUR_IN_SECONDS, COOKIEPATH, COOKIE_DOMAIN, is_ssl(), true );
					} else {
						$transient_key = sanitize_text_field( wp_unslash( $_COOKIE['transient_key'] ) );
					}
					set_site_transient( 'mo_otp_' . $transient_key . $key, $val, 12 * HOUR_IN_SECONDS );
					break;

			}
		}

		/**
		 * Retrieves a value stored in session by key.
		 *
		 * @param string $key Key used to store the value.
		 * @return mixed Value stored under the key, or null if not found.
		 */
		public static function get_session_var( $key ) {
			if ( empty( $key ) ) {
				return;
			}
			switch ( MOV_SESSION_TYPE ) {
				case 'COOKIE':
					$raw = isset( $_COOKIE[ $key ] ) ? sanitize_text_field( wp_unslash( $_COOKIE[ $key ] ) ) : null;
					if ( null === $raw ) {
						return null;
					}
					$decoded = json_decode( $raw, true );
					if ( null === $decoded && json_last_error() !== JSON_ERROR_NONE ) {
						return null;
					}
					return $decoded;
				case 'SESSION':
					self::check_session();
					// phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized -- Session value is intentionally not sanitized as it's internal data stored by this plugin.
					$raw = isset( $_SESSION[ $key ] ) ? $_SESSION[ $key ] : null;
					if ( null === $raw ) {
						return null;
					}
					return maybe_unserialize( $raw );
				case 'CACHE':
					$raw = wp_cache_get( $key );
					if ( null === $raw ) {
						return null;
					}
					return maybe_unserialize( $raw );
				case 'TRANSIENT':
					if ( empty( $_COOKIE['transient_key'] ) ) {
						return null;
					}
					$transient_key = sanitize_text_field( wp_unslash( $_COOKIE['transient_key'] ) );
					return get_site_transient( 'mo_otp_' . $transient_key . $key );
			}
		}

		/**
		 * Unsets session values for the specified key.
		 *
		 * @param string $key Key to unset from the session.
		 * @return void
		 */
		public static function unset_session( $key ) {
			switch ( MOV_SESSION_TYPE ) {
				case 'COOKIE':
					unset( $_COOKIE[ $key ] );
					setcookie( $key, '', time() - ( 15 * 60 ), COOKIEPATH, COOKIE_DOMAIN, is_ssl(), true );
					break;
				case 'SESSION':
					self::check_session();
					unset( $_SESSION[ $key ] );
					break;
				case 'CACHE':
					wp_cache_delete( $key );
					break;
				case 'TRANSIENT':
					if ( ! empty( $_COOKIE['transient_key'] ) ) {
						$transient_key = sanitize_text_field( wp_unslash( $_COOKIE['transient_key'] ) );
						delete_site_transient( 'mo_otp_' . $transient_key . $key );
					}
					break;
			}
		}

		/**
		 * Checks if PHP session is started and initiates it if not.
		 *
		 * @return void
		 */
		public static function check_session() {
			if ( 'SESSION' === MOV_SESSION_TYPE ) {
				if ( '' === session_id() || ! isset( $_SESSION ) ) {
					session_start();
				}
			}
		}
	}
}
