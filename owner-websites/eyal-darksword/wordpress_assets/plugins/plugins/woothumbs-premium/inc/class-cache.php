<?php
/**
 * Cache.
 *
 * @package iconic-woothumbs
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Iconic_WooThumbs_Cache.
 */
class Iconic_WooThumbs_Cache {
	/**
	 * DB version.
	 *
	 * @var string
	 */
	protected static $db_version = '1.0.0';

	/**
	 * DB name.
	 *
	 * @var string
	 */
	public static $db_table_name = 'iconic_woothumbs_cache';

	/**
	 * Install/update the DB table.
	 *
	 * @param bool $manual_request Boolean true if this is a manual request; defaults to false.
	 * @return void
	 */
	public static function install_table( $manual_request = false ) {
		if ( ! $manual_request && version_compare( get_site_option( 'iconic_woothumbs_db_version' ), self::$db_version, '>=' ) ) {
			return;
		}

		$table_name = self::get_cache_table_name();

		$sql = "CREATE TABLE $table_name (
		`cache_key` varchar(200) NOT NULL,
		`cache_data` longtext,
		PRIMARY KEY (`cache_key`)
		) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;";

		require_once ABSPATH . 'wp-admin/includes/upgrade.php';

		dbDelta( $sql );

		update_option( 'iconic_woothumbs_db_version', self::$db_version );
	}

	/**
	 * Is caching enabled?
	 *
	 * @return boolean
	 */
	public static function is_caching_enabled() {
		global $iconic_woothumbs_class;

		return ( '1' === $iconic_woothumbs_class->settings['performance_cache_enable'] );
	}

	/**
	 * Get the cache DB table name.
	 *
	 * @return string
	 */
	public static function get_cache_table_name() {
		global $wpdb;

		return $wpdb->prefix . self::$db_table_name;
	}

	/**
	 * Get the cache key name to get/set data in the cache table.
	 *
	 * @param int|string $id   WooCommerce product ID.
	 * @param string     $type Type of cache key.
	 *
	 * @return string
	 */
	public static function get_cache_key_name( $id, $type ) {
		if ( 'image_ids' === $type ) {
			$name = sprintf( 'image_ids_%d', $id );
		} elseif ( 'dvi' === $type ) {
			$name = sprintf( 'dvi_%d', $id );
		} elseif ( 'images' === $type ) {
			$name = sprintf( 'images_%d', $id );
		} elseif ( 'variation' === $type ) {
			$name = sprintf( 'variation_%d', $id );
		} elseif ( 'matching' === $type ) {
			$name = sprintf( 'matching_variation_%d', $id );
		} elseif ( 'ai_images' === $type ) {
			$name = sprintf( 'ai_images_%d', $id );
		} else {
			$name = false;
		}

		// NOTE: this filter needs phasing out in a future release.
		$name = apply_filters( 'iconic_woothumbs_transient_name', $name, $type, $id );

		return apply_filters( 'iconic_woothumbs_cache_key_name', $name, $type, $id );
	}

	/**
	 * Delete all entries in the cache table.
	 *
	 * @param bool $force      True to force deletion, false to not force.
	 * @param int  $product_id WooCommerce product ID.
	 */
	public static function delete_cache_entries( $force = false, $product_id = false ) {
		if ( isset( $_POST['iconic-woothumbs-delete-image-cache'] ) || true === $force ) {
			global $wpdb;

			$table_name = self::get_cache_table_name();

			if ( $product_id ) {
				$product     = wc_get_product( $product_id );
				$product_ids = array( $product_id );

				// Build an array of product/product variation IDs
				// we can loop over to delete all records.
				if ( $product && 'variable' === $product->get_type() ) {
					$product_ids = array_merge( $product_ids, $product->get_children() );
				} else {
					$product_ids = array( $product_id );
				}

				foreach ( $product_ids as $product_id ) {
					$wpdb->query(
						$wpdb->prepare(
							"
							DELETE FROM $table_name
							WHERE `cache_key` LIKE %s
							",
							'%_' . $product_id
						)
					);
				}
			} else {
				$wpdb->query( 'DELETE FROM ' . $table_name ); // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
			}
		}
	}

	/**
	 * Get a cache entry
	 *
	 * @param string $key Cache key name.
	 *
	 * @return mixed
	 */
	public static function get_cache_entry( $key ) {
		if ( ! self::is_caching_enabled() || ! $key ) {
			return false;
		}

		global $wpdb;

		$table_name = self::get_cache_table_name();

		if ( ! self::does_table_exist() ) {
			return false;
		}

		$result = $wpdb->get_row(
			$wpdb->prepare(
				"
				SELECT * FROM $table_name
				WHERE `cache_key` = %s
				",
				$key
			),
			ARRAY_A
		);

		if ( ! $result || ! isset( $result['cache_data'] ) ) {
			return false;
		}

		return json_decode( $result['cache_data'], true );
	}

	/**
	 * Set a cache entry
	 *
	 * @param string $key  Cache key name.
	 * @param mixed  $data Data to cache.
	 *
	 * @return void
	 */
	public static function set_cache_entry( $key, $data ) {
		if ( ! $key || ! $data ) {
			return;
		}

		global $wpdb;

		if ( ! self::does_table_exist() ) {
			return;
		}

		$wpdb->replace(
			self::get_cache_table_name(),
			array(
				'cache_key'  => sanitize_text_field( $key ),
				'cache_data' => is_numeric( $data ) ? absint( $data ) : wp_json_encode( $data ),
			)
		);
	}

	/**
	 * Check if the cache table exists.
	 *
	 * @return bool
	 */
	public static function does_table_exist() {
		global $wpdb;

		static $exists = null;

		if ( ! is_null( $exists ) ) {
			return $exists;
		}

		$exists = ( $wpdb->get_var( $wpdb->prepare( 'SHOW TABLES LIKE %s', $wpdb->esc_like( self::get_cache_table_name() ) ) ) === self::get_cache_table_name() );

		return $exists;
	}
}
