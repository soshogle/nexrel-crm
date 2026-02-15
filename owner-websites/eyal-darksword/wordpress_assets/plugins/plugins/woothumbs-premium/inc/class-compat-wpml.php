<?php

/**
 * WPML Compatibility.
 *
 * @since 5.0.0
 */
class Iconic_WooThumbs_Compat_WPML {
	/**
	 * Run.
	 */
	public static function run() {
		add_action( 'plugins_loaded', array( __CLASS__, 'init' ) );
	}

	/**
	 * Init.
	 */
	public static function init() {
		if ( ! defined( 'ICL_SITEPRESS_VERSION' ) ) {
			return;
		}

		add_filter( 'iconic_woothumbs_all_image_ids', array( __CLASS__, 'modify_image_ids' ), 10, 2 );
		add_filter( 'wpml_apply_save_attachment_actions', array( __CLASS__, 'enable_media_meta_duplication' ), 10, 2 );
		add_filter( 'iconic_woothumbs_image_ids_cache_results', array( __CLASS__, 'modify_image_ids_cache_results' ), 10, 2 );
	}

	/**
	 * Modify image IDs.
	 *
	 * @param array $image_ids
	 * @param int   $product_id
	 *
	 * @return array
	 */
	public static function modify_image_ids( $image_ids, $product_id ) {
		return array_map( array( __CLASS__, 'get_translated_media_id' ), $image_ids );
	}

	/**
	 * Get translated media ID
	 *
	 * @param int $media_file_id
	 *
	 * @return bool|int
	 */
	public static function get_translated_media_id( $media_file_id ) {
		$media_file_id = apply_filters( 'wpml_object_id', $media_file_id, 'attachment', true );

		return $media_file_id;
	}

	/**
	 * Get translated term name for Attribute Images.
	 *
	 * @param string $term_name      Term name e.g `Red`.
	 * @param string $attribute_name Attribute name e.g `pa_color`.
	 *
	 * @return string|bool
	 */
	public static function get_translated_ai_term_name( $term_name, $attribute_name ) {
		_deprecated_function( __FUNCTION__, '5.13.0' );

		// This is automatically filtered into the current language by WPML.
		// Converting to slug here as more robust.
		$term_object = get_term_by( 'slug', sanitize_title( $term_name ), $attribute_name );

		if ( ! $term_object || is_array( $term_object ) ) {
			return false;
		}

		return sanitize_title( $term_object->slug );
	}

	/**
	 * Enable media meta duplication.
	 *
	 * Ensures that WooThumbs media meta data is copied
	 * when images are duplicated during translation.
	 *
	 * @param bool $is_enabled Is meta duplicated for media.
	 * @param int  $post_id    WordPress post ID.
	 */
	public static function enable_media_meta_duplication( $is_enabled, $post_id ) {
		return true;
	}

	/**
	 * Modify the image IDs cache results.
	 *
	 * @param array|bool $image_ids Array of image IDs or boolean false.
	 *
	 * @return void
	 */
	public static function modify_image_ids_cache_results( $image_ids, $product ) {
		global $iconic_woothumbs_class;

		$caching_enabled = $iconic_woothumbs_class->cache_class()::is_caching_enabled();

		// Remove the featured image before we carry out the check.
		$variation_gallery_ids = $product->get_gallery_image_ids();

		if ( isset( $variation_gallery_ids['featured'] ) ) {
			unset( $variation_gallery_ids['featured'] );
		}

		if ( is_admin() || ! $caching_enabled || $image_ids || $variation_gallery_ids || 'variation' !== $product->get_type() ) {
			return $image_ids;
		}

		// At this stage we know this is a WPML translated variation that has no
		// variation images of its own, so let's check the parent product for images,
		// first staging with the cache, then falling back to the image IDs.
		$id             = $iconic_woothumbs_class->wpml_get_original_variation_id( $product->get_id() );
		$cache_key_name = $iconic_woothumbs_class->cache_class()::get_cache_key_name( $id, 'image_ids' );
		$image_ids      = $iconic_woothumbs_class->cache_class()::get_cache_entry( $cache_key_name );

		if ( false === $image_ids ) {
			// We need to remove and re-add the filter here to prevent an infinite loop.
			remove_filter( 'iconic_woothumbs_image_ids_cache_results', array( __CLASS__, 'modify_image_ids_cache_results' ), 10 );
			$image_ids = Iconic_WooThumbs_Product::get_image_ids( $id );
			add_filter( 'iconic_woothumbs_image_ids_cache_results', array( __CLASS__, 'modify_image_ids_cache_results' ), 10, 2 );
		}

		return $image_ids;
	}
}
