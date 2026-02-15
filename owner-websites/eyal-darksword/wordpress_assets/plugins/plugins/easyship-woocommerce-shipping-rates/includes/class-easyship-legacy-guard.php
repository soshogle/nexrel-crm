<?php
/**
 * Easyship Conflict Guard (PHP 7.1+)
 *
 * - Detects legacy Easyship plugin copies under one or more legacy folders.
 * - If active (site or current network), deactivates them immediately and forces a one-time admin refresh so your plugin loads clean in the next request.
 * - While legacy folders exist (active or not), shows persistent admin warnings.
 * - Warns if the currently running plugin slug differs from the canonical slug defined in Easyship_Constants::PLUGIN_SLUG.
 * - No file deletions. No cross-network or cross-site sweeps (keeps it fast).
 *
 * @package Easyship\ConflictGuard
 */

declare(strict_types=1);

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

// Prevent double inclusion.
if ( class_exists( 'Easyship_Legacy_Guard', false ) ) {
	return;
}

/**
 * Self-contained legacy conflict scanner/deactivator + notifier.
 */
final class Easyship_Legacy_Guard {
	/**
	 * Legacy directories to scan.
	 *
	 * @var string[]
	 */
	private const LEGACY_DIRS = array(
		'easyship-woocommerce-shipping-rates',
		'easyship-shipping-rates',
	);

	/**
	 * Legacy directories that were found in this WordPress installation.
	 *
	 * @var string[]
	 */
	private static $found_legacy_dirs = array();

	/**
	 * Map of legacy dir => list of basenames found.
	 *
	 * @var array<string,string[]>
	 */
	private static $dir_basenames = array();

	/**
	 * Whether any legacy plugin (under any configured dir) is present (installed).
	 *
	 * @var bool
	 */
	private static $legacy_present = false;

	/**
	 * Legacy plugin basenames that were deactivated during this request.
	 * Used for notices and to decide whether to refresh.
	 *
	 * @var string[]
	 */
	private static $deactivated_this_request = array();

	/**
	 * The slug of the plugin currently running this guard (derived from the main file path).
	 *
	 * @var string
	 */
	private static $current_plugin_slug = '';

	/**
	 * Initialize the guard.
	 *
	 * @param string $current_plugin_file Absolute path to the main plugin file.
	 */
	public static function bootstrap( string $current_plugin_file ): void {
		// Load constants early so canonical slug is available.
		require_once __DIR__ . '/class-easyship-constants.php';

		// Capture the current plugin slug.
		$basename = plugin_basename( $current_plugin_file );
		$dir      = dirname( $basename );

		if ( '.' === $dir ) {
			// Plugin is a single PHP file at the plugins root dir.
			self::$current_plugin_slug = basename( $basename, '.php' );
		} else {
			self::$current_plugin_slug = $dir;
		}

		// Block site- and network-level activation of legacy plugins when our plugin is active.
		add_filter( 'pre_update_option_active_plugins', array( __CLASS__, 'filter_active_plugins' ), 10, 2 );
		if ( is_multisite() ) {
			add_filter( 'pre_update_site_option_active_sitewide_plugins', array( __CLASS__, 'filter_active_sitewide_plugins' ), 10, 2 );
		}

		// ── FAST PATH: check if any legacy directory exists; if not AND we're not in admin, bail now.
		self::$found_legacy_dirs = array();
		foreach ( self::LEGACY_DIRS as $dir ) {
			// ✅ skip canonical slug entirely
			if ( Easyship_Constants::PLUGIN_SLUG === $dir ) {
				continue;
			}
			$abs = trailingslashit( WP_PLUGIN_DIR ) . $dir;
			if ( is_dir( $abs ) ) {
				self::$found_legacy_dirs[] = (string) $dir;
			}
		}
		if ( empty( self::$found_legacy_dirs ) && ! is_admin() && ! is_network_admin() ) {
			// No legacy dirs on disk and no need for admin notices (front-end): hard return.
			return;
		}

		if ( ! empty( self::$found_legacy_dirs ) ) {
			// Build basenames by scanning *.php at the first level of each legacy dir.
			self::$dir_basenames = array();
			foreach ( self::$found_legacy_dirs as $dir ) {
				self::$dir_basenames[ $dir ] = self::discover_basenames_for_dir(
					trailingslashit( WP_PLUGIN_DIR ) . $dir,
					$dir
				);
			}

			// Mark presence if any basenames were discovered.
			self::$legacy_present = false;
			foreach ( self::$dir_basenames as $basenames ) {
				if ( ! empty( $basenames ) ) {
					self::$legacy_present = true;
					break;
				}
			}

			// If any legacy variant is active, deactivate it immediately (site or current network).
			$deactivation_happened = false;
			if ( self::$legacy_present ) {
				foreach ( self::$dir_basenames as $basenames ) {
					foreach ( $basenames as $legacy_basename ) {
						if ( self::is_active_anywhere( $legacy_basename ) ) {
							if ( self::deactivate_plugin_safely( $legacy_basename ) ) {
								self::$deactivated_this_request[] = $legacy_basename;
								$deactivation_happened            = true;
							}
						}
					}
				}
			}

			// If we deactivated legacy in this request, force a one-time admin refresh.
			if ( $deactivation_happened && self::should_refresh_now() ) {
				self::refresh_current_admin(); // refresh_current_admin() exits.
			}
		}

		// Hook notices only if we actually need to show something:
		// - legacy dir(s) exist (to show deactivation/persistent warnings), OR
		// - canonical slug might need a notice.
		$need_admin_hooks = ( ! empty( self::$found_legacy_dirs ) ) || ( ! self::canonical_is_ok_now() );

		if ( $need_admin_hooks ) {
			add_action( 'admin_notices', array( __CLASS__, 'admin_notices' ) );
			if ( is_multisite() ) {
				add_action( 'network_admin_notices', array( __CLASS__, 'network_admin_notices' ) );
			}
		}
	}

	/**
	 * Output admin (single-site) notices.
	 */
	public static function admin_notices(): void {
		if ( ! current_user_can( 'activate_plugins' ) ) {
			return;
		}

		// If we blocked an activation in this request/redirect cycle, inform the admin.
		$blocked = get_transient( 'easyship_lg_blocked_activation' );
		if ( $blocked ) {
			delete_transient( 'easyship_lg_blocked_activation' );
			echo '<div class="notice notice-warning is-dismissible"><p>';
			printf(
				/* translators: %s: list of plugin basenames whose activation was blocked */
				esc_html__( 'Easyship: activation of legacy plugin(s) was blocked to prevent conflicts: %s', 'easyship-woocommerce-shipping-rates' ),
				esc_html( $blocked )
			);
			echo '</p></div>';
		}

		// Deactivation message (this request).
		if ( ! empty( self::$deactivated_this_request ) ) {
			echo '<div class="notice notice-warning is-dismissible"><p>';
			printf(
				/* translators: %s: list of deactivated plugin basenames */
				esc_html__( 'Easyship: legacy plugins were active and have been deactivated to prevent conflicts: %s', 'easyship-woocommerce-shipping-rates' ),
				esc_html( implode( ', ', self::$deactivated_this_request ) )
			);
			echo '</p></div>';
		}

		// Persistent messages for each present legacy dir.
		foreach ( self::$found_legacy_dirs as $dir ) {
			echo '<div class="notice notice-warning is-dismissible"><p>';
			printf(
				/* translators: %s: legacy directory name (plugin slug) */
				esc_html__( 'Easyship: we detected an older Easyship plugin installed under the "%s" folder. It is outdated (likely from a manual install). The current plugin is the correct official version — please delete that folder to avoid confusion.', 'easyship-woocommerce-shipping-rates' ),
				esc_html( $dir )
			);
			echo '</p></div>';
		}

		// Canonical slug recommendation.
		self::show_canonical_notice();
	}

	/**
	 * Output network (multisite) notices.
	 */
	public static function network_admin_notices(): void {
		if ( ! is_multisite() || ! current_user_can( 'manage_network_plugins' ) ) {
			return;
		}

		// If we blocked a network activation, inform the network admin.
		$blocked = get_site_transient( 'easyship_lg_blocked_activation' );
		if ( $blocked ) {
			delete_site_transient( 'easyship_lg_blocked_activation' );
			echo '<div class="notice notice-warning is-dismissible"><p>';
			printf(
				/* translators: %s: list of plugin basenames whose activation was blocked */
				esc_html__( 'Easyship: activation of legacy plugin(s) was blocked to prevent conflicts: %s', 'easyship-woocommerce-shipping-rates' ),
				esc_html( $blocked )
			);
			echo '</p></div>';
		}

		// Deactivation message (this request).
		if ( ! empty( self::$deactivated_this_request ) ) {
			echo '<div class="notice notice-warning is-dismissible"><p>';
			printf(
				/* translators: %s: list of deactivated plugin basenames */
				esc_html__( 'Easyship: legacy plugins were network-active and have been deactivated to prevent conflicts: %s', 'easyship-woocommerce-shipping-rates' ),
				esc_html( implode( ', ', self::$deactivated_this_request ) )
			);
			echo '</p></div>';
		}

		// Persistent messages for each present legacy dir.
		foreach ( self::$found_legacy_dirs as $dir ) {
			echo '<div class="notice notice-warning is-dismissible"><p>';
			printf(
				/* translators: %s: legacy directory name (plugin slug) */
				esc_html__( 'Easyship: we detected an older Easyship plugin installed under the "%s" folder. It is outdated (likely from a manual install). The current plugin is the correct official version — please delete that folder to avoid confusion.', 'easyship-woocommerce-shipping-rates' ),
				esc_html( $dir )
			);
			echo '</p></div>';
		}

		// Canonical slug recommendation.
		self::show_canonical_notice();
	}

	/**
	 * Strip legacy plugins from the active_plugins list before WP saves it.
	 *
	 * @param array $new_value Proposed new value for 'active_plugins' (indexed array of basenames).
	 * @param array $old_value Current value for 'active_plugins'.
	 * @return array Filtered array without legacy basenames.
	 */
	public static function filter_active_plugins( $new_value, $old_value ): array {
		if ( $new_value === $old_value ) {
			return $new_value;
		}

		$legacy_dir_lookup = array_flip(
			array_filter(
				self::LEGACY_DIRS,
				static function ( $dir ) {
					return Easyship_Constants::PLUGIN_SLUG !== $dir;
				}
			)
		);
		$blocked           = array();
		$filtered          = array();

		// Iterate over incoming list and keep only non-legacy.
		foreach ( (array) $new_value as $basename ) {
			$dir = dirname( (string) $basename );
			if ( isset( $legacy_dir_lookup[ $dir ] ) ) {
				$blocked[] = $basename;
				continue;
			}
			$filtered[] = $basename;
		}

		if ( ! empty( $blocked ) ) {
			set_transient( 'easyship_lg_blocked_activation', implode( ', ', $blocked ), 300 );
		}

		return $filtered;
	}

	/**
	 * Strip legacy plugins from the active_sitewide_plugins map before WP saves it (multisite).
	 *
	 * @param array $new_value Proposed new value for 'active_sitewide_plugins' (assoc: basename => timestamp).
	 * @param array $old_value Current value.
	 * @return array Filtered map without legacy basenames.
	 */
	public static function filter_active_sitewide_plugins( $new_value, $old_value ): array {
		if ( $new_value === $old_value ) {
			return $new_value;
		}

		$legacy_dir_lookup = array_flip(
			array_filter(
				self::LEGACY_DIRS,
				static function ( $dir ) {
					return Easyship_Constants::PLUGIN_SLUG !== $dir;
				}
			)
		);
		$blocked           = array();
		$filtered          = array();

		// Iterate over incoming map and keep only non-legacy.
		foreach ( (array) $new_value as $basename => $timestamp ) {
			$dir = dirname( (string) $basename );
			if ( isset( $legacy_dir_lookup[ $dir ] ) ) {
				$blocked[] = $basename;
				continue;
			}
			$filtered[ $basename ] = $timestamp;
		}

		if ( ! empty( $blocked ) ) {
			set_site_transient( 'easyship_lg_blocked_activation', implode( ', ', $blocked ), 300 );
		}

		return $filtered;
	}

	// --- Helpers below ---

	/**
	 * Canonical slug recommendation (shared).
	 */
	private static function show_canonical_notice(): void {
		$canonical = Easyship_Constants::PLUGIN_SLUG;
		$current   = self::$current_plugin_slug;

		if ( $current !== $canonical ) {
			echo '<div class="notice notice-info is-dismissible"><p>';
			printf(
				/* translators: %1$s: current plugin slug, %2$s: canonical plugin slug */
				esc_html__( 'Easyship: this plugin appears to be running from the "%1$s" slug. It is recommended to use the canonical slug "%2$s" instead for consistency and updates.', 'easyship-woocommerce-shipping-rates' ),
				esc_html( $current ),
				esc_html( $canonical )
			);
			echo '</p></div>';
		}
	}

	/**
	 * Discover legacy plugin basenames quickly by scanning a legacy directory for .php files.
	 *
	 * @param string $legacy_dir_abs Absolute path to the legacy folder.
	 * @param string $legacy_dir_key Directory name (relative under WP_PLUGIN_DIR).
	 * @return string[] List of plugin basenames under the legacy folder.
	 */
	private static function discover_basenames_for_dir( $legacy_dir_abs, $legacy_dir_key ): array {
		$basenames = array();

		// Only look at first-level PHP files inside the legacy directory; no sort for speed.
		$pattern = trailingslashit( $legacy_dir_abs ) . '*.php';
		$files   = glob( $pattern, GLOB_NOSORT );

		if ( is_array( $files ) && ! empty( $files ) ) {
			foreach ( $files as $file ) {
				$fname = wp_basename( $file );
				if ( '' !== $fname ) {
					$basenames[] = $legacy_dir_key . '/' . $fname;
				}
			}
		}

		// If no files were found (or glob failed), include the conventional main as a fallback.
		if ( empty( $basenames ) ) {
			$basenames[] = $legacy_dir_key . '/' . $legacy_dir_key . '.php';
		}

		return array_values( array_unique( $basenames ) );
	}

	/**
	 * Check if the current request is a good candidate for a refresh.
	 */
	private static function should_refresh_now(): bool {
		if ( defined( 'DOING_CRON' ) && DOING_CRON ) {
			return false;
		}
		if ( defined( 'REST_REQUEST' ) && REST_REQUEST ) {
			return false;
		}
		if ( isset( $_GET['esr_cg_refreshed'] ) ) { // phpcs:ignore WordPress.Security.NonceVerification.Recommended
			return false;
		}
		if ( ! is_admin() && ! is_network_admin() ) {
			return false;
		}
		if ( ! current_user_can( 'activate_plugins' ) ) {
			return false;
		}
		if ( function_exists( 'wp_doing_ajax' ) && wp_doing_ajax() ) {
			return false;
		}
		if ( headers_sent() ) {
			return false;
		}
		return true;
	}

	/**
	 * Refresh the current admin page.
	 */
	private static function refresh_current_admin(): void {
		$scheme = is_ssl() ? 'https' : 'http';

		// Prefer HTTP_HOST (already includes port if set), fall back to SERVER_NAME(+SERVER_PORT).
		$host = isset( $_SERVER['HTTP_HOST'] ) ? sanitize_text_field( wp_unslash( $_SERVER['HTTP_HOST'] ) ) : '';

		if ( '' === $host ) {
			// Fallback to SERVER_NAME (+ SERVER_PORT when non-default).
			$server_name = isset( $_SERVER['SERVER_NAME'] ) ? sanitize_text_field( wp_unslash( $_SERVER['SERVER_NAME'] ) ) : '';
			$port        = isset( $_SERVER['SERVER_PORT'] ) ? (int) $_SERVER['SERVER_PORT'] : 0;

			if ( '' !== $server_name ) {
				$host       = $server_name;
				$needs_port = ( 'http' === $scheme && 80 !== $port ) || ( 'https' === $scheme && 443 !== $port );
				if ( $port && $needs_port ) {
					$host .= ':' . $port;
				}
			}
		}

		// REQUEST_URI is a relative path + query. We sanitize the final URL below.
		$uri = isset( $_SERVER['REQUEST_URI'] ) ? wp_unslash( $_SERVER['REQUEST_URI'] ) : ''; // phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized -- sanitized via esc_url_raw() on the final URL

		// Fallback to an admin landing if REQUEST_URI is missing.
		if ( '' === $host || '' === $uri ) {
			$url = is_network_admin() ? network_admin_url() : admin_url();
		} else {
			$url = $scheme . '://' . $host . $uri;
		}

		// Prevent loops, then add our one-time flag.
		$url = remove_query_arg( 'esr_cg_refreshed', $url );
		$url = add_query_arg( 'esr_cg_refreshed', '1', $url );

		wp_safe_redirect( esc_url_raw( $url ) );
		exit;
	}

	/**
	 * Check if a plugin is active either on the current site or network-wide.
	 *
	 * WordPress stores active plugins differently:
	 * - Site-active plugins: indexed array of plugin basenames.
	 *   -> use in_array() to check.
	 * - Network-active plugins: associative array of plugin basenames => activation timestamp.
	 *   -> use isset() to check key existence.
	 *
	 * @param string $basename Plugin basename (e.g. 'easyship/easyship.php').
	 * @return bool True if the plugin is active on this site or network-wide, false otherwise.
	 */
	private static function is_active_anywhere( string $basename ): bool {
		$active = (array) get_option( 'active_plugins', array() );
		if ( in_array( $basename, $active, true ) ) {
			return true;
		}
		if ( is_multisite() ) {
			$network = (array) get_site_option( 'active_sitewide_plugins', array() );
			return isset( $network[ $basename ] );
		}
		return false;
	}

	/**
	 * Deactivate a plugin safely.
	 *
	 * @param string $basename The plugin basename.
	 * @return bool Whether the plugin was deactivated.
	 */
	private static function deactivate_plugin_safely( string $basename ): bool {
		if ( is_multisite() ) {
			$network = (array) get_site_option( 'active_sitewide_plugins', array() );
			if ( isset( $network[ $basename ] ) ) {
				deactivate_plugins( $basename, true, true );
				return true;
			}
		}
		$active = (array) get_option( 'active_plugins', array() );
		if ( in_array( $basename, $active, true ) ) {
			deactivate_plugins( $basename, true );
			return true;
		}
		return false;
	}

	/**
	 * Quick check whether we can conclusively skip canonical notices.
	 *
	 * @return bool True if canonical slug matches current slug.
	 */
	private static function canonical_is_ok_now(): bool {
		return Easyship_Constants::PLUGIN_SLUG === self::$current_plugin_slug;
	}
}
