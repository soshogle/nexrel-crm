<?php
/**
 * Update.
 *
 * @package iconic-woothumbs
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Iconic_WooThumbs_Update.
 *
 * @class    Iconic_WooThumbs_Update
 * @version  1.0.0
 * @package  Iconic_WooThumbs
 */
class Iconic_WooThumbs_Update {
	/**
	 * Run update.
	 */
	public static function run() {
		add_action( 'admin_init', array( __CLASS__, 'update' ) );
	}

	/**
	 * Update WooThumbs.
	 */
	public static function update() {
		global $iconic_woothumbs_class;

		$option_name     = 'iconic_woothumbs_version';
		$current_version = get_option( $option_name );

		if ( version_compare( $current_version, $iconic_woothumbs_class->version, '<' ) ) {
			$iconic_woothumbs_class->cache_class()::delete_cache_entries();
			update_option( $option_name, $iconic_woothumbs_class->version );
		}
	}
}