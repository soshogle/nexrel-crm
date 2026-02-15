<?php
/**
 * Element Teasers manager for Add Element panel.
 *
 * @since 8.7
 */

if ( ! defined( 'ABSPATH' ) ) {
	die( '-1' );
}
/**
 * Class WPB_Element_Teasers
 *
 * Manages element teasers that promote additional products/plugins.
 *
 * @since 8.7
 */
class WPB_Element_Teasers {
	/**
	 * Teasers API URL.
	 *
	 * @since 8.7
	 * @var string
	 */
	protected $teasers_api_url = 'https://support.wpbakery.com/api/external/teasers';

	/**
	 * Option key for teasers data.
	 *
	 * @since 8.7
	 * @var string
	 */
	protected $teasers_option_key = 'wpb_element_teasers_data';

	/**
	 * Transient key for cache control.
	 *
	 * @since 8.7
	 * @var string
	 */
	protected $cache_transient_key = 'wpb_element_teasers_cache';

	/**
	 * Cache duration in seconds (24 hours).
	 *
	 * @since 8.7
	 * @var int
	 */
	protected $cache_duration_success = DAY_IN_SECONDS;

	/**
	 * Cache duration in seconds (1 hour).
	 *
	 * @since 8.7
	 * @var int
	 */
	protected $cache_duration_fail = HOUR_IN_SECONDS;


	/**
	 * Get element teasers from db.
	 *
	 * @return array Array of teaser data.
	 * @since 8.7
	 */
	public function get_teasers() {
		$teasers = get_option( $this->teasers_option_key, [] );
		return $this->filter_active_plugins( $teasers );
	}

	/**
	 * Preload teasers data by checking cache and fetching from API if needed.
	 *
	 * This method is called from admin_init hook to populate the cache
	 * before the editor loads, preventing API delays during editor usage.
	 *
	 * @since 8.7
	 */
	public function preload_teasers() {
		$teasers = get_option( $this->teasers_option_key, [] );
		$cache_valid = get_transient( $this->cache_transient_key );

		if ( false === $cache_valid || empty( $teasers ) ) {
			$api_teasers = $this->fetch_teasers_from_api();
			if ( ! empty( $api_teasers ) ) {
				update_option( $this->teasers_option_key, $api_teasers );
				set_transient( $this->cache_transient_key, true, $this->cache_duration_success );
			} else {
				// On API failure, keep using existing cache and set shorter retry period.
				set_transient( $this->cache_transient_key, true, $this->cache_duration_fail );
			}
		}
	}

	/**
	 * Process teasers: mark active plugins and move them to end of list.
	 *
	 * @param array $teasers Array of teaser data.
	 * @return array Processed array of teasers.
	 * @since 8.7
	 */
	protected function filter_active_plugins( $teasers ) {
		if ( empty( $teasers ) ) {
			return [];
		}

		// Make sure is_plugin_active function is available.
		if ( ! function_exists( 'is_plugin_active' ) ) {
			include_once ABSPATH . 'wp-admin/includes/plugin.php';
		}

		$regular_teasers = [];
		$activated_teasers = [];
		foreach ( $teasers as $teaser ) {
			// Check if plugin slug is provided.
			if ( ! empty( $teaser['plugin_slug'] ) ) {
				// Check if plugin is active.
				if ( function_exists( 'is_plugin_active' ) && is_plugin_active( $teaser['plugin_slug'] ) ) {
					$teaser['is_activated'] = true;
					$activated_teasers[] = $teaser;
					continue;
				}
			}
			$regular_teasers[] = $teaser;
		}

		// Merge regular teasers first, then activated ones at the end.
		return array_merge( $regular_teasers, $activated_teasers );
	}

	/**
	 * Fetch teasers from API.
	 *
	 * @return array Array of teasers or empty array on failure.
	 * @since 8.7
	 */
	protected function fetch_teasers_from_api() {
		$response = wp_remote_get( $this->teasers_api_url, [ 'timeout' => 10 ] );

		if ( is_wp_error( $response ) ) {
			return [];
		}

		if ( wp_remote_retrieve_response_code( $response ) !== 200 ) {
			return [];
		}

		$body = wp_remote_retrieve_body( $response );
		$teasers = json_decode( $body, true );

		return is_array( $teasers ) ? $teasers : [];
	}
}
