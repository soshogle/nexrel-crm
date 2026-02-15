<?php
/**
 * Uninstall script for OTP Spam Preventer addon
 *
 * @package otpspampreventer
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

if ( ! defined( 'WP_UNINSTALL_PLUGIN' ) ) {
	exit;
}

/**
 * Clean up OTP Spam Preventer addon data on uninstall
 */
function mo_osp_uninstall_cleanup() {
	global $wpdb;

	$cache_key    = 'mosp_uninstall_spam_option_names';
	$option_names = wp_cache_get( $cache_key, 'mo_osp' );
	if ( false === $option_names ) {
		$option_names = $wpdb->get_col( // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
			$wpdb->prepare(
				"SELECT option_name FROM {$wpdb->options} WHERE option_name LIKE %s",
				$wpdb->esc_like( 'mo_osp_spam_data_' ) . '%'
			)
		);
		wp_cache_set( $cache_key, $option_names, 'mo_osp' );
	}

	if ( ! empty( $option_names ) ) {
		foreach ( $option_names as $option_name ) {
			delete_option( $option_name );
		}
	}

	wp_cache_delete( $cache_key, 'mo_osp' );

	delete_option( 'mo_osp_settings' );

	wp_clear_scheduled_hook( 'mo_osp_cleanup_expired' );

	wp_cache_flush_group( 'mo_osp' );
}

mo_osp_uninstall_cleanup();
