<?php
/**
 * Utility functions for the Easyship plugin.
 *
 * @package Easyship\Utilities
 */

declare(strict_types=1);

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * This class provides a set of utility functions for the Easyship plugin.
 */
final class Easyship_Utils {
	/**
	 * Get a Easyship API base URL.
	 *
	 * @param string $request_path Optional request path to append to the base URL.
	 */
	public static function api_base_url( $request_path = '' ): string {
		$base = Easyship_Constants::EASYSHIP_API_BASE_URL;
		$path = ltrim( $request_path, '/' );
		return '' === $path ? $base : $base . $path;
	}

	/**
	 * Get a Easyship Auth URL.
	 *
	 * @param string $request_path Optional request path to append to the base URL.
	 */
	public static function auth_base_url( $request_path = '' ): string {
		$base = Easyship_Constants::EASYSHIP_AUTH_BASE_URL;
		$path = ltrim( $request_path, '/' );
		return '' === $path ? $base : $base . $path;
	}

	/**
	 * Encode for storage (JSON first; fallback to serialize if needed).
	 *
	 * @param mixed $value The value to encode.
	 * @return string
	 */
	public static function serialize( $value ) {
		$json = wp_json_encode( $value );
		if ( false !== $json && null !== $json ) {
			return $json;
		}
		// Extremely rare fallback (e.g., resources). Safe like maybe_serialize.
		return maybe_serialize( $value );
	}

	/**
	 * Decode from storage (accepts JSON or legacy serialized).
	 *
	 * @param mixed $raw The value to decode.
	 * @return mixed|null Decoded value, or null for empty/unknown.
	 */
	public static function unserialize( $raw ) {
		if ( '' === $raw || null === $raw ) {
			return null;
		}

		// Already a PHP array/object? Just return it.
		if ( is_array( $raw ) || is_object( $raw ) ) {
			return $raw;
		}

		// Try JSON first.
		if ( is_string( $raw ) ) {
			$decoded = json_decode( $raw, true );
			if ( json_last_error() === JSON_ERROR_NONE ) {
				return $decoded;
			}
		}

		// Legacy serialized?
		if ( is_string( $raw ) && is_serialized( $raw ) ) {
			// Hardened unserialize: no classes.
			// phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions.serialize_unserialize,WordPress.PHP.NoSilencedErrors.Discouraged
			$val = @unserialize( $raw, array( 'allowed_classes' => false ) );
			if ( false !== $val || 'b:0;' === $raw ) {
				return $val;
			}
		}

		// Unknown/opaque string — return as-is so callers can decide.
		return $raw;
	}

	/**
	 * Base64 (standard) encoding for protocol-required encoding (OAuth, Basic auth).
	 * Not for obfuscation.
	 *
	 * @param string $data The value to encode.
	 */
	public static function base64_encode( string $data ): string {
		// phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions.obfuscation_base64_encode -- Required by protocol specs.
		return base64_encode( $data );
	}

	/**
	 * Base64URL encode per RFC 7515 (JWT): replace +/ with -_ and strip =
	 *
	 * @param string $data The value to encode.
	 */
	public static function base64url_encode( string $data ): string {
		// phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions.obfuscation_base64_encode -- Required by JWT specification.
		return rtrim( strtr( base64_encode( $data ), '+/', '-_' ), '=' );
	}

	/**
	 * Resolve the effective currency to use when requesting rates.
	 *
	 * Priority:
	 *  1) If $force_store_default, always use the store default (Woo setting).
	 *  2) If WOOCS is active, use its current currency.
	 *  3) If WCML exposes a helper, use it.
	 *  4) Fallback to Woo core (get_woocommerce_currency), if it returns a value.
	 *  5) Finally, fallback to store default.
	 *
	 * @param bool $force_store_default When true, ignore switchers and return the base store currency.
	 * @return string 3-letter uppercase ISO currency code.
	 */
	public static function get_active_currency( bool $force_store_default = false ): string {
		// 1) Base store currency (always available).
		$store_default = (string) get_option( 'woocommerce_currency', 'USD' );

		if ( ! $force_store_default ) {
			if ( defined( 'WOOCS_VERSION' ) ) {
				// 2) WOOCS (WooCommerce Currency Switcher) – read its current runtime currency.
				// phpcs:disable WordPress.NamingConventions.ValidVariableName.VariableNotSnakeCase
				global $WOOCS;
				if ( isset( $WOOCS ) && is_object( $WOOCS ) && ! empty( $WOOCS->current_currency ) ) {
					$currency = (string) $WOOCS->current_currency;
				}
				// phpcs:enable WordPress.NamingConventions.ValidVariableName.VariableNotSnakeCase
			} elseif ( defined( 'WCML_VERSION' ) ) {
				// 3) WCML (WooCommerce Multilingual & Multicurrency) – use a helper if it exists.
				// Some WCML versions expose this helper; don't assume it always exists.
				$fn = 'wcml_get_woocommerce_currency';
				if ( function_exists( $fn ) ) {
					$maybe = (string) $fn();
					if ( '' !== $maybe ) {
						$currency = $maybe;
					}
				}
			} elseif ( function_exists( 'get_woocommerce_currency' ) ) {
				// 4) Core WooCommerce function as a last non-forced source.
				$maybe = (string) get_woocommerce_currency();
				if ( '' !== $maybe ) {
					$currency = $maybe;
				}
			}
		}

		// Normalize to 3-letter uppercase; fallback to store default if invalid.
		$currency = strtoupper( (string) $currency );
		if ( ! preg_match( '/^[A-Z]{3}$/', $currency ) ) {
			$currency = strtoupper( $store_default );
		}

		return $currency;
	}

	/**
	 * Get the identifier for the current store.
	 *
	 * @return int The current store's identifier.
	 */
	public static function get_store_id(): int {
		// This is derived from legacy code.
		// In practice, this value doesn't have any practical value.
		return get_current_network_id();
	}
}
