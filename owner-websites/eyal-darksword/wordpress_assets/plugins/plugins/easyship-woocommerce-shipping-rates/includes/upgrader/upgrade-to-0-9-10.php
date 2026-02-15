<?php
/**
 * This provides the class that does the work of upgrading the WP database to v0.9.10 of the plugin.
 *
 * @package Easyship\Upgrade
 */

declare(strict_types=1);

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

return new class() {
	/**
	 * Upgrade to version 0.9.10.
	 */
	public function do_it(): void {
		$this->migrate_access_token_options_to_global_singleton();
		$this->migrate_woocommerce_easyship_settings();
	}

	/**
	 * Migrate legacy per-site Easyship access-token options like:
	 *   woocommerce_easyship_es_access_token
	 *   woocommerce_easyship_access_token
	 *   es_access_token
	 *   es_access_token_*
	 * These are moved to a global singleton option (site-scope): Easyship_WooCommerce_Integration::OPTION__API_ACCESS_TOKEN
	 *
	 * Rules:
	 * - If the standardized key already exists (non-empty), delete ALL legacy keys.
	 * - Otherwise, pick the first non-empty, safe legacy value and write it to the standardized key, then delete all legacy keys.
	 * - Log each action.
	 *
	 * This function is idempotent (safe to run multiple times).
	 */
	private function migrate_access_token_options_to_global_singleton(): void {
		global $wpdb;

		// If already set (non-empty), we’ll just clean up duplicates below.
		$global_token_already_set = ! empty( Easyship_WooCommerce_Integration::get_global_api_access_token() );

		$table = $wpdb->options;

		$form_1_key  = 'woocommerce_easyship_es_access_token';
		$form_2_key  = 'woocommerce_easyship_access_token';
		$form_3_key  = 'es_access_token';
		$form_4_like = $wpdb->esc_like( 'es_access_token_' ) . '%';

		$sql = "
		SELECT option_name, option_value
		FROM (
			SELECT 1 AS seq, option_name, option_value
			FROM {$table}
			WHERE option_name = %s

			UNION ALL

			SELECT 2 AS seq, option_name, option_value
			FROM {$table}
			WHERE option_name = %s

			UNION ALL

			SELECT 3 AS seq, option_name, option_value
			FROM {$table}
			WHERE option_name = %s

			UNION ALL

			SELECT 4 AS seq, option_name, option_value
			FROM {$table}
			WHERE option_name LIKE %s
		) relevant_options
		WHERE option_name <> %s
		ORDER BY seq
		";
		// phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
		$rows = $wpdb->get_results( $wpdb->prepare( $sql, $form_1_key, $form_2_key, $form_3_key, $form_4_like, Easyship_WooCommerce_Integration::OPTION__API_ACCESS_TOKEN ) );

		if ( ! empty( $rows ) ) {
			Easyship_Logger::info(
				'Starting access token option migration.',
				array( 'matches' => wp_list_pluck( $rows, 'option_name' ) )
			);

			// If the global token hasn't been set yet, adopt the first non-empty legacy value.
			if ( ! $global_token_already_set ) {
				foreach ( $rows as $row ) {
					$val = Easyship_Utils::unserialize( $row->option_value );

					// Ensure string; if array/object slipped in, persist a JSON string.
					if ( is_array( $val ) || is_object( $val ) ) {
						$val = Easyship_Utils::serialize( $val );
					} else {
						$val = (string) $val;
					}

					if ( $val ) {
						Easyship_WooCommerce_Integration::set_global_api_access_token( $val );

						Easyship_Logger::info(
							'Access token migrated to singleton option.',
							array(
								'from' => $row->option_name,
							)
						);

						break;
					}
				}
			}

			// Cleanup: remove all legacy keys now that we standardized (or confirmed no value).
			foreach ( $rows as $row ) {
				delete_option( $row->option_name );
				Easyship_Logger::info( 'Deleted legacy access token option.', array( 'key' => $row->option_name ) );
			}
		}
	}

	/**
	 * Migrate legacy Easyship WooCommerce settings.
	 *
	 * Rules:
	 * - Global:
	 *   - Strip "woocommerce_{method_id}_" prefix from keys.
	 *   - If the canonical global token option is empty, source it from:
	 *       (1) token candidates in the global WC settings array (after prefix-strip),
	 *       (2) token candidates using pre–prefix-strip names in the same array,
	 *       (3) token candidates in the RAW (pre-normalized) stored value.
	 *   - After prefix removal, rename "skip_shipping_class" -> "skip_shipping_classes".
	 *   - Remove token candidate keys from the global settings array (not from instances).
	 *
	 * - Instances:
	 *   - For each "woocommerce_{method_id}_{instance_id}_settings":
	 *     - Strip "woocommerce_{method_id}_" prefix from keys.
	 *     - Do NOT delete/move instance token keys.
	 *     - Rename "skip_shipping_class" -> "skip_shipping_classes".
	 *
	 * This function is idempotent (safe to run multiple times).
	 */
	private function migrate_woocommerce_easyship_settings(): void {
		global $wpdb;

		// ---- Helpers ----

		$wc_shipping_method_id  = Easyship_WooCommerce_Integration::WC_SHIPPING_METHOD_ID;
		$global_settings_option = 'woocommerce_' . $wc_shipping_method_id . '_settings';
		$legacy_prefix          = 'woocommerce_easyship_';

		$normalize_array = static function ( $raw ) {
			$val = Easyship_Utils::unserialize( $raw );
			if ( is_array( $val ) ) {
				return $val;
			}
			if ( is_object( $val ) ) {
				return (array) $val;
			}
			// Unknown/non-structured -> empty array so downstream key lookups are sane.
			return array();
		};

		$strip_prefix_from_keys = static function ( array $settings, string $prefix, array &$rename_log ) {
			$new  = array();
			$plen = strlen( $prefix );
			foreach ( $settings as $k => $v ) {
				if ( is_string( $k ) && 0 === strpos( $k, $prefix ) ) {
					$new_k            = substr( $k, $plen );
					$rename_log[ $k ] = $new_k;
					// If the new key already exists, preserve the existing value (don't overwrite).
					if ( array_key_exists( $new_k, $settings ) ) {
						// Keep existing; note in log.
						$rename_log[ $k ] .= ' (kept existing value)';
					} else {
						$new[ $new_k ] = $v;
					}
				} else {
					$new[ $k ] = $v;
				}
			}
			return $new;
		};

		$rename_key__skip_shipping_class = static function ( array $settings ) {
			// After prefix handling, rename only the final, unprefixed key.
			if ( array_key_exists( 'skip_shipping_class', $settings ) ) {
				// If the plural key already exists, do not overwrite it.
				if ( ! array_key_exists( 'skip_shipping_classes', $settings ) ) {
					$settings['skip_shipping_classes'] = $settings['skip_shipping_class'];
				}
				unset( $settings['skip_shipping_class'] );
			}
			return $settings;
		};

		$adjust_to_token = static function ( $raw ) {
			return isset( $raw ) && is_scalar( $raw ) ? trim( (string) $raw ) : '';
		};

		// Helper to drop empty api_key/api_secret.
		$drop_empty_credentials = static function ( array &$arr, array &$removed ) use ( $adjust_to_token ) {
			foreach ( array( 'api_key', 'api_secret' ) as $ckey ) {
				if ( array_key_exists( $ckey, $arr ) ) {
					$val = $adjust_to_token( $arr[ $ckey ] );
					if ( '' === $val ) {
						unset( $arr[ $ckey ] );
						$removed[] = $ckey;
					}
				}
			}
		};

		$token_candidates = array(
			'woocommerce_easyship_es_access_token',
			'woocommerce_easyship_access_token',
			'es_access_token_' . Easyship_Utils::get_store_id(), // Historical store-specific key used by old code.
			'es_access_token',
		);

		// ---- Global settings ----

		$current_global_token = Easyship_WooCommerce_Integration::get_global_api_access_token();
		$has_global_token     = ! empty( $current_global_token );

		$raw_global        = get_option( $global_settings_option, null );
		$global_settings   = $normalize_array( $raw_global );
		$global_changed    = false;
		$rename_log_global = array();

		if ( ! empty( $global_settings ) ) {
			// Strip legacy prefix from keys (log renames).
			$global_settings = $strip_prefix_from_keys( $global_settings, $legacy_prefix, $rename_log_global );

			// If canonical global token is empty, try to source it from this option's value.
			if ( ! $has_global_token ) {
				$found_token = '';

				// Look in prefix-stripped array.
				foreach ( $token_candidates as $cand ) {
					$val = $adjust_to_token( $global_settings[ $cand ] );
					if ( '' !== $val ) {
						$found_token = $val;
						break;
					}
				}

				// If still not found, try pre-prefix names (LEGACY_PREFIX . cand) on the *same* array.
				if ( '' === $found_token ) {
					foreach ( $token_candidates as $cand ) {
						$val = $adjust_to_token( $global_settings[ $legacy_prefix . $cand ] );
						if ( '' !== $val ) {
							$found_token = $val;
							break;
						}
					}
				}

				// Last fallback: the RAW stored value.
				if ( '' === $found_token ) {
					$raw_global_array = $normalize_array( $raw_global );
					foreach ( $token_candidates as $cand ) {
						$val = $adjust_to_token( $raw_global_array[ $cand ] );
						if ( '' !== $val ) {
							$found_token = $val;
							break;
						}
					}
				}

				if ( '' !== $found_token ) {
					Easyship_WooCommerce_Integration::set_global_api_access_token( $found_token );
					$global_changed = true;
					Easyship_Logger::info(
						'Migrated global access token to canonical option.',
						array( 'global_key' => Easyship_WooCommerce_Integration::OPTION__API_ACCESS_TOKEN )
					);
				}
			}

			// Remove token candidate keys from the global settings array only (do NOT touch instances).
			$removed_token_keys = array();
			foreach ( $token_candidates as $cand ) {
				if ( array_key_exists( $cand, $global_settings ) ) {
					unset( $global_settings[ $cand ] );
					$removed_token_keys[] = $cand;
				}
				$prefixed = $legacy_prefix . $cand;
				if ( array_key_exists( $prefixed, $global_settings ) ) {
					unset( $global_settings[ $prefixed ] );
					$removed_token_keys[] = $prefixed;
				}
			}
			if ( ! empty( $removed_token_keys ) ) {
				$global_changed = true;
				Easyship_Logger::info(
					'Removed legacy token keys from global WooCommerce settings.',
					array( 'removed_keys' => $removed_token_keys )
				);
			}

			// Drop legacy API credentials if empty or if a global API access token exists.
			$removed_credentials = array();
			if ( $has_global_token ) {
				// Token present -> drop both credentials if they exist (even if non-empty).
				foreach ( array( 'api_key', 'api_secret' ) as $ckey ) {
					if ( array_key_exists( $ckey, $global_settings ) ) {
						unset( $global_settings[ $ckey ] );
						$removed_credentials[] = $ckey;
					}
				}
			} else {
				// No token -> only drop empty credentials.
				$drop_empty_credentials( $global_settings, $removed_credentials );
			}
			if ( ! empty( $removed_credentials ) ) {
				$global_changed = true;
				Easyship_Logger::info(
					'Removed legacy API credentials from global WooCommerce settings.',
					array(
						'removed_keys' => $removed_credentials,
						'reason'       => $has_global_token ? 'global_token_present' : 'empty_values',
					)
				);
			}

			// Rename skip_shipping_class -> skip_shipping_classes.
			$before          = $global_settings;
			$global_settings = $rename_key__skip_shipping_class( $global_settings );
			if ( $before !== $global_settings ) {
				$global_changed = true;
				Easyship_Logger::info( 'Renamed global skip_shipping_class -> skip_shipping_classes.' );
			}

			// Persist normalized global settings (array; WP handles serialization).
			if ( $global_changed || ! empty( $rename_log_global ) ) {
				if ( ! empty( $rename_log_global ) ) {
					Easyship_Logger::info(
						'Stripped legacy prefix from global WooCommerce settings keys.',
						array( 'renamed' => $rename_log_global )
					);
				}
				update_option( $global_settings_option, $global_settings );
				Easyship_Logger::info( 'Finalized global WooCommerce Easyship settings migration.' );
			}
		}

		// ---- Instance settings ----

		// Pattern: woocommerce_{method_id}_{instance_id}_settings (e.g., woocommerce_easyship_3_settings).
		$like = $wpdb->esc_like( 'woocommerce_' . $wc_shipping_method_id . '_' ) . '%' . $wpdb->esc_like( '_settings' );
		$rows = $wpdb->get_results(
			$wpdb->prepare(
				"SELECT option_name, option_value FROM {$wpdb->options} WHERE option_name LIKE %s",
				$like
			),
			ARRAY_A
		);

		if ( is_array( $rows ) && ! empty( $rows ) ) {
			foreach ( $rows as $row ) {
				$option_name     = $row['option_name'];
				$inst_settings   = $normalize_array( $row['option_value'] );
				$inst_changed    = false;
				$rename_log_inst = array();

				// Strip legacy prefix from keys (do NOT touch/move any token keys).
				$inst_settings = $strip_prefix_from_keys( $inst_settings, $legacy_prefix, $rename_log_inst );

				// Rename skip_shipping_class -> skip_shipping_classes.
				$before        = $inst_settings;
				$inst_settings = $rename_key__skip_shipping_class( $inst_settings );
				if ( $before !== $inst_settings ) {
					$inst_changed = true;
					Easyship_Logger::info(
						'Renamed instance skip_shipping_class -> skip_shipping_classes.',
						array( 'option_name' => $option_name )
					);
				}

				// Drop legacy API credentials in instance if empty or if instance token exists.
				$removed_credentials_inst = array();
				$inst_token               = $adjust_to_token( $inst_settings['api_access_token'] ?? '' );

				if ( ! empty( $inst_token ) ) {
					// Instance token present -> drop both credentials if they exist (even if non-empty).
					foreach ( array( 'api_key', 'api_secret' ) as $ckey ) {
						if ( array_key_exists( $ckey, $inst_settings ) ) {
							unset( $inst_settings[ $ckey ] );
							$removed_credentials_inst[] = $ckey;
						}
					}
					$inst_changed = true;
				} else {
					// No instance token -> only drop empty creds.
					foreach ( array( 'api_key', 'api_secret' ) as $ckey ) {
						if ( array_key_exists( $ckey, $inst_settings ) ) {
							$val = $adjust_to_token( $inst_settings[ $ckey ] );
							if ( empty( $val ) ) {
								unset( $inst_settings[ $ckey ] );
								$removed_credentials_inst[] = $ckey;
								$inst_changed               = true;
							}
						}
					}
				}
				if ( ! empty( $removed_credentials_inst ) ) {
					Easyship_Logger::info(
						'Removed legacy API credentials from INSTANCE WooCommerce settings.',
						array(
							'option_name'  => $option_name,
							'removed_keys' => $removed_credentials_inst,
							'reason'       => ( '' !== $inst_token ) ? 'instance_token_present' : 'empty_values',
						)
					);
				}

				// Persist if changed or if keys were renamed.
				if ( $inst_changed || ! empty( $rename_log_inst ) ) {
					if ( ! empty( $rename_log_inst ) ) {
						Easyship_Logger::info(
							'Stripped legacy prefix from instance WooCommerce settings keys.',
							array(
								'option_name' => $option_name,
								'renamed'     => $rename_log_inst,
							)
						);
					}
					update_option( $option_name, $inst_settings );
				}
			}
		}
	}
};
