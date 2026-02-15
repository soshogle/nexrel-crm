<?php
/**
 * Logging facilities for the Easyship plugin.
 *
 * @package Easyship\Utilities
 */

declare(strict_types=1);

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

require_once EASYSHIP_PATH . 'includes/class-easyship-constants.php';

/**
 * This class provides a set of logging facilities for the Easyship plugin.
 */
final class Easyship_Logger {
	private const INCLUDE_CALLER = true;

	private const REDACT_WITH = '***';

	/**
	 * Default source/channel name. Used by WooCommerce to name log files.
	 */
	private const DEFAULT_SOURCE = Easyship_Constants::PLUGIN_SLUG;

	/**
	 * Keys (case-insensitive) to redact in context arrays.
	 */
	private const REDACT_KEYS = array(
		'authorization',
		'password',
		'secret',
		'token',
		'_key',
	);

	/**
	 * Custom logger (PSR-3 or callable($level, $message, $context)).
	 *
	 * @var mixed|null
	 */
	private static $custom_logger = null;

	/**
	 * Log source/channel.
	 *
	 * @var string|null
	 */
	private static $source;

	/**
	 * Optionally inject a custom logger.
	 * - PSR-3: must have ->log($level, $message, array $context = []).
	 * - Callable: function(string $level, string $message, array $context): void
	 *
	 * @param mixed $logger The new logger to use.
	 */
	public static function set_logger( $logger ): void {
		self::$custom_logger = $logger;
	}

	/**
	 * Override the source/channel name (used for WooCommerce log filenames).
	 *
	 * @param string $source The new source/channel name.
	 */
	public static function set_source( string $source ): void {
		self::$source = ! empty( $source ) ? $source : self::DEFAULT_SOURCE;
	}

	/**
	 * Main log method.
	 *
	 * @param string $level   emergency|alert|critical|error|warning|notice|info|debug.
	 * @param string $message Log message.
	 * @param array  $context Extra data.
	 */
	public static function log( string $level, string $message, array $context = array() ): void {
		/**
		 * Filters whether the logger should prefix messages with the caller (Class::method).
		 *
		 * @since 0.9.10
		 *
		 * @param bool $include Whether to include the caller prefix. Default true.
		 * @return bool
		 */
		$include_caller = apply_filters( 'easyship_logger_include_caller', self::INCLUDE_CALLER );
		$message        = $include_caller ? self::format_with_caller( $message ) : $message;

		$context = self::redact_context( $context );
		$source  = self::$source ?? self::DEFAULT_SOURCE;

		// 1) Custom logger (PSR-3 or callable).
		if ( self::$custom_logger ) {
			$l = self::$custom_logger;
			// PSR-3 object?
			if ( is_object( $l ) && method_exists( $l, 'log' ) ) {
				$l->log( $level, $message, $context );
				return;
			}
			// Callable?
			if ( is_callable( $l ) ) {
				$l( $level, $message, $context );
				return;
			}
		}

		// 2) WooCommerce logger if available.
		if ( function_exists( 'wc_get_logger' ) ) {
			$logger = wc_get_logger();
			$logger->log(
				$level,
				$message,
				array(
					'source'  => $source, // Controls WC log filename.
					'context' => $context,
				)
			);
			return;
		}

		// 3) Fallback: PHP error_log (one line, JSON context).
		// phpcs:ignore WordPress.WP.AlternativeFunctions.json_encode_json_encode
		$encoded = function_exists( 'wp_json_encode' ) ? wp_json_encode( $context ) : json_encode( $context );
		if ( is_string( $encoded ) && strlen( $encoded ) > 8000 ) {
			$encoded = substr( $encoded, 0, 8000 ) . '...';
		}
		// phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_error_log
		error_log(
			sprintf(
				'%s [%s]: %s %s',
				$source,
				strtoupper( $level ),
				$message,
				empty( $context ) ? '' : $encoded
			)
		);
	}

	// Convenience wrappers.

	/**
	 * Log with "emergency" severity.
	 *
	 * @param string $message Log message.
	 * @param array  $context Extra data.
	 */
	public static function emergency( string $message, array $context = array() ): void {
		self::log( 'emergency', $message, $context );
	}

	/**
	 * Log with "alert" severity.
	 *
	 * @param string $message Log message.
	 * @param array  $context Extra data.
	 */
	public static function alert( string $message, array $context = array() ): void {
		self::log( 'alert', $message, $context );
	}

	/**
	 * Log with "critical" severity.
	 *
	 * @param string $message Log message.
	 * @param array  $context Extra data.
	 */
	public static function critical( string $message, array $context = array() ): void {
		self::log( 'critical', $message, $context );
	}

	/**
	 * Log with "error" severity.
	 *
	 * @param string $message Log message.
	 * @param array  $context Extra data.
	 */
	public static function error( string $message, array $context = array() ): void {
		self::log( 'error', $message, $context );
	}

	/**
	 * Log with "warning" severity.
	 *
	 * @param string $message Log message.
	 * @param array  $context Extra data.
	 */
	public static function warning( string $message, array $context = array() ): void {
		self::log( 'warning', $message, $context );
	}

	/**
	 * Log with "notice" severity.
	 *
	 * @param string $message Log message.
	 * @param array  $context Extra data.
	 */
	public static function notice( string $message, array $context = array() ): void {
		self::log( 'notice', $message, $context );
	}

	/**
	 * Log with "info" severity.
	 *
	 * @param string $message Log message.
	 * @param array  $context Extra data.
	 */
	public static function info( string $message, array $context = array() ): void {
		self::log( 'info', $message, $context );
	}

	/**
	 * Log with "debug" severity.
	 *
	 * @param string $message Log message.
	 * @param array  $context Extra data.
	 */
	public static function debug( string $message, array $context = array() ): void {
		self::log( 'debug', $message, $context );
	}

	/**
	 * Redact secrets recursively in context arrays.
	 *
	 * @param array $context The information to analyze and redact.
	 */
	private static function redact_context( array $context ): array {
		$out = array();

		foreach ( $context as $k => $v ) {
			if ( is_array( $v ) ) {
				$out[ $k ] = self::redact_context( $v );
				continue;
			}

			if ( is_object( $v ) ) {
				$out[ $k ] = sprintf( '[object %s]', get_class( $v ) );
				continue;
			}

			// Redact by key-name match.
			$lower_key = is_string( $k ) ? strtolower( $k ) : $k;
			if ( is_string( $lower_key ) && self::should_redact_key( $lower_key ) ) {
				$out[ $k ] = self::REDACT_WITH;
				continue;
			}

			$out[ $k ] = $v;
		}

		return $out;
	}

	/**
	 * Decide if a key name should be redacted based on partial, case-insensitive match.
	 *
	 * @param string $key The key to verify whether redaction is necessary.
	 * @return bool
	 */
	private static function should_redact_key( string $key ): bool {
		static $pattern = null;

		if ( null === $pattern ) {
			/**
			 * Filters the list of substrings that will trigger redaction when found in context keys.
			 *
			 * @since 0.9.10
			 *
			 * @param string[] $redact_keys Substrings (case-insensitive), e.g. 'authorization', '_key'.
			 * @return string[]
			 */
			$needles = apply_filters( 'easyship_logger_redact_keys', self::REDACT_KEYS );

			// Build a single case-insensitive regex like: ~(authorization|password|secret|token|_key)~i .
			$parts   = array_map(
				static function ( $s ) {
					return preg_quote( (string) $s, '~' );
				},
				(array) $needles
			);
			$pattern = '~(' . implode( '|', $parts ) . ')~i';
		}

		return (bool) preg_match( $pattern, $key );
	}

	/**
	 * Prefix a message with the calling Class::method (or function) using a shallow backtrace.
	 * Uses DEBUG_BACKTRACE_IGNORE_ARGS and a depth limit for performance.
	 *
	 * @param string $message Log message.
	 */
	private static function format_with_caller( string $message ): string {
		// phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_debug_backtrace
		$trace = debug_backtrace( DEBUG_BACKTRACE_IGNORE_ARGS, 12 );

		$external = null;
		foreach ( $trace as $frame ) {
			// Skip our own frames (format_with_caller/log/info/debug/etc).
			if ( __CLASS__ === ( $frame['class'] ?? null ) ) {
				continue;
			}
			$external = $frame;
			break;
		}

		if ( $external ) {
			// Build a nice prefix from the external frame.
			if ( isset( $external['class'] ) ) {
				$prefix = sprintf( '%s%s%s', $external['class'], $external['type'] ?? '::', $external['function'] ?? 'unknown' );
			} elseif ( isset( $external['function'] ) ) {
				$prefix = $external['function'];
			} else {
				$file   = isset( $external['file'] ) ? basename( (string) $external['file'] ) : 'unknown';
				$line   = (string) ( $external['line'] ?? '?' );
				$prefix = $file . ':' . $line;
			}
		} else {
			// Fallback: previous behavior (will usually show Easyship_Logger::info).
			$caller = $trace[2] ?? null;
			if ( ! $caller ) {
				return $message;
			}

			if ( isset( $caller['class'] ) ) {
				$prefix = sprintf( '%s%s%s', $caller['class'], $caller['type'] ?? '::', $caller['function'] );
			} else {
				$prefix = $caller['function'] ?? 'unknown';
			}
		}

		return sprintf( '[%s] %s', $prefix, $message );
	}
}
