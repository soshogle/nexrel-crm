<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Iconic_WooThumbs_Import.
 *
 * @class    Iconic_WooThumbs_Import
 * @version  1.0.0
 * @package  Iconic_WooThumbs
 */
class Iconic_WooThumbs_Import {
	/**
	 * Run.
	 */
	public static function run() {
		add_action( 'woocommerce_product_import_inserted_product_object', array( __CLASS__, 'clear_cache_after_import' ), 10, 2 );
	}

	/**
	 * Clear image cache after import.
	 *
	 * @param WC_Product $product
	 * @param array      $data
	 */
	public static function clear_cache_after_import( $product, $data ) {
		global $iconic_woothumbs_class;

		$iconic_woothumbs_class->cache_class()::delete_cache_entries( true, $product->get_id() );
	}
}
