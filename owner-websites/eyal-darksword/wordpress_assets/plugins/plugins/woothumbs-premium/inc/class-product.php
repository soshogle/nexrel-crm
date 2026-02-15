<?php
/**
 * Iconic WooThumbs.
 *
 * @package iconic-woothumbs
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Iconic_WooThumbs_Product.
 *
 * @class    Iconic_WooThumbs_Product
 * @version  1.0.0
 * @package  Iconic_WooThumbs
 */
class Iconic_WooThumbs_Product {
	/**
	 * Get Product
	 *
	 * @param int $id Product ID.
	 *
	 * @return WC_Product
	 */
	public static function get_product( $id ) {
		$post_type = get_post_type( $id );

		if ( 'product_variation' !== $post_type ) {
			return wc_get_product( absint( $id ) );
		}

		return new WC_Product_Variation( absint( $id ) );
	}

	/**
	 * Get parent ID
	 *
	 * @param WC_Product $product Product ID.
	 *
	 * @return int
	 */
	public static function get_parent_id( $product ) {
		return method_exists( $product, 'get_parent_id' ) ? $product->get_parent_id() : $product->id;
	}

	/**
	 * Get images.
	 *
	 * @param int  $product_id     WooCommerce product ID.
	 * @param bool $default_render Whether this is for the default render, or not.
	 *
	 * @return array
	 */
	public static function get_images( $product_id, $default_render = false ) {
		global $iconic_woothumbs_class;

		$product_id = absint( $product_id );
		$image_ids  = self::get_image_ids( $product_id, $default_render );

		$caching_enabled = $iconic_woothumbs_class->cache_class()::is_caching_enabled();
		$cache_key_name  = $iconic_woothumbs_class->cache_class()::get_cache_key_name( $product_id, 'images' );
		$images          = ( $caching_enabled ) ? $iconic_woothumbs_class->cache_class()::get_cache_entry( $cache_key_name ) : false;

		if ( empty( $images ) && ! empty( $image_ids ) ) {
			$images       = array();
			$images_added = array();

			foreach ( $image_ids as $image_id ) {
				$image_data = Iconic_WooThumbs_Images::get_attachment_props( $image_id, $product_id );
				/**
				 * Filter: iconic_woothumbs_single_image_data
				 *
				 * @filter iconic_woothumbs_single_image_data
				 * @since 5.0.0
				 * @param array $image_data Array of image data.
				 * @param int   $image_id   WordPress media attachment ID.
				 * @param int   $product_id WooCommerce product ID.
				 */
				$image_data = apply_filters( 'iconic_woothumbs_single_image_data', $image_data, $image_id, $product_id );

				if ( Iconic_WooThumbs_Images::get_dedupe_images() && ! in_array( (int) $image_id, $images_added, true ) ) {
					$images[]       = $image_data;
					$images_added[] = (int) $image_id;
				} else {
					$images[] = $image_data;
				}
			}

			if ( $caching_enabled ) {
				$iconic_woothumbs_class->cache_class()::set_cache_entry( $cache_key_name, $images );
			}
		}

		/**
		 * Filter: iconic_woothumbs_all_images_data
		 *
		 * @filter iconic_woothumbs_all_images_data
		 * @since 5.0.0
		 * @param array $images     Nested array of image data.
		 * @param int   $product_id WooCommerce product ID.
		 */
		return apply_filters( 'iconic_woothumbs_all_images_data', $images, $product_id );
	}

	/**
	 * Get images for attribute images (JavaScript).
	 *
	 * @param int   $product_id WooCommerce product ID.
	 * @param array $image_ids  Image IDs.
	 *
	 * @return array
	 */
	public static function get_ai_images( $product_id, $image_ids ) {
		$product_id = absint( $product_id );

		if ( ! empty( $image_ids ) ) {
			$images       = array();
			$images_added = array();

			foreach ( $image_ids as $image_id ) {
				$image_data = Iconic_WooThumbs_Images::get_attachment_props( $image_id, $product_id );

				/**
				 * Filter: iconic_woothumbs_single_image_data
				 *
				 * @filter iconic_woothumbs_single_image_data
				 * @since 5.0.0
				 * @param array $image_data Array of image data.
				 * @param int   $image_id   WordPress media attachment ID.
				 * @param int   $product_id WooCommerce product ID.
				 */
				$image_data = apply_filters( 'iconic_woothumbs_single_image_data', $image_data, $image_id, $product_id );

				if ( Iconic_WooThumbs_Images::get_dedupe_images() && ! in_array( (int) $image_id, $images_added, true ) ) {
					$images[]       = $image_data;
					$images_added[] = (int) $image_id;
				} else {
					$images[] = $image_data;
				}
			}
		}

		/**
		 * Filter: iconic_woothumbs_ai_images_data
		 *
		 * @filter iconic_woothumbs_ai_images_data
		 * @since 5.0.0
		 * @param array $images     Nested array of image data.
		 * @param int   $product_id WooCommerce product ID.
		 */
		return apply_filters( 'iconic_woothumbs_ai_images_data', $images, $product_id );
	}

	/**
	 * Get product.
	 *
	 * @param int|WC_Product $product        Product ID|WC_Product instance.
	 * @param bool           $default_render Whether this is for the default render, or not.
	 *
	 * @return array
	 */
	public static function get_image_ids( $product, $default_render = false ) {
		global $iconic_woothumbs_class;

		if ( is_numeric( $product ) ) {
			$product = wc_get_product( $product );
		}

		if ( ! $product ) {
			return array();
		}

		$caching_enabled = $iconic_woothumbs_class->cache_class()::is_caching_enabled();
		$cache_key_name  = $iconic_woothumbs_class->cache_class()::get_cache_key_name( $product->get_id(), 'image_ids' );
		$image_ids       = ( $caching_enabled ) ? $iconic_woothumbs_class->cache_class()::get_cache_entry( $cache_key_name ) : false;
		/**
		 * Filter: modify the results from an image_ids cache check.
		 * 
		 * @see Iconic_WooThumbs_Compat_WPML
		 * @since 5.6.0
		 */
		$image_ids = apply_filters( 'iconic_woothumbs_image_ids_cache_results', $image_ids, $product );

		if ( false === $image_ids ) {
			$image_ids     = array();
			$product_image = $product->get_image_id();

			// Add featured image.
			if ( ! empty( $product_image ) ) {
				$image_ids['featured'] = $product_image;
			}

			// Add gallery images.
			$image_ids = array_merge( $image_ids, $product->get_gallery_image_ids() );

			// Add attribute images.
			if ( $default_render && $product->is_type( 'variation' ) ) {
				$ai_image_ids = Iconic_WooThumbs_Attributes::get_attribute_image_ids_for_variation( $product );

				if ( $ai_image_ids ) {
					$image_ids = array_merge( $image_ids, $ai_image_ids );
				}
			}

			// Set placeholder or parent images if no images present.
			if ( empty( $image_ids ) ) {
				$parent_id = $product->get_parent_id();

				if ( $parent_id > 0 ) {
					$image_ids = self::get_image_ids( $parent_id );
				} else {
					$image_ids['featured'] = 'placeholder';
				}
			}

			if ( $caching_enabled && count( $image_ids ) > 1 ) {
				$iconic_woothumbs_class->cache_class()::set_cache_entry( $cache_key_name, $image_ids );
			}
		}

		if ( Iconic_WooThumbs_Images::get_dedupe_images() ) {
			$image_ids = array_unique( $image_ids );
		}

		/**
		 * Filter: iconic_woothumbs_all_image_ids
		 *
		 * @filter iconic_woothumbs_all_image_ids
		 * @since 5.0.0
		 * @param array $image_ids  Array of WordPress media attachment IDs.
		 * @param int   $product_id WooCommerce product ID.
		 */
		return apply_filters( 'iconic_woothumbs_all_image_ids', $image_ids, $product->get_id() );
	}

	/**
	 * Find matching product variation
	 *
	 * @param WC_Product $product    WC_Product instance.
	 * @param array      $attributes Selected product attributes.
	 *
	 * @return int Matching variation ID or 0.
	 */
	public static function find_matching_product_variation( $product, $attributes ) {
		global $iconic_woothumbs_class;

		foreach ( $attributes as $key => $value ) {
			if ( strpos( $key, 'attribute_' ) === 0 ) {
				continue;
			}

			unset( $attributes[ $key ] );
			$attributes[ sprintf( 'attribute_%s', $key ) ] = $value;
		}

		$attributes_string = wp_json_encode( $attributes );
		$attributes_md5    = md5( $attributes_string );
		$cache_key_name    = $iconic_woothumbs_class->cache_class()::get_cache_key_name( sprintf( '%d_%s', $product->get_id(), $attributes_md5 ), 'matching' );
		$cache_entry       = $iconic_woothumbs_class->cache_class()::get_cache_entry( $cache_key_name );

		if ( $cache_entry ) {
			return $cache_entry;
		}

		$data_store                 = WC_Data_Store::load( 'product' );
		$matching_product_variation = $data_store->find_matching_product_variation( $product, $attributes );

		$iconic_woothumbs_class->cache_class()::set_cache_entry( $cache_key_name, $matching_product_variation );

		return $matching_product_variation;
	}

	/**
	 * Get product settings.
	 *
	 * @param int $product_id Product ID.
	 *
	 * @return array
	 */
	public static function get_settings( $product_id ) {
		static $product_settings = array();

		if ( empty( $product_settings[ $product_id ] ) ) {
			$product_settings[ $product_id ] = (array) get_post_meta( $product_id, '_iconic_woothumbs', true );
		}

		return $product_settings[ $product_id ];
	}

	/**
	 * Get product setting.
	 *
	 * @param int    $product_id Product ID.
	 * @param string $setting    Setting ID.
	 *
	 * @return mixed
	 */
	public static function get_setting( $product_id, $setting ) {
		$settings       = self::get_settings( $product_id );
		$settings_value = ! isset( $settings[ $setting ] ) ? null : $settings[ $setting ];

		/**
		 * Filter WooThumbs product settings data.
		 *
		 * @filter iconic_woothumbs_get_product_setting
		 * @since 1.0.0
		 * @param mixed  $settings_value
		 * @param int    $product_id
		 * @param string $setting
		 * @param array  $settings
		 */
		return apply_filters( 'iconic_woothumbs_get_product_setting', $settings_value, $product_id, $setting, $settings );
	}

	/**
	 * Get default product/variation ID
	 *
	 * Grabs the default variation ID, depending on the settings
	 * for that particular product. Or the main product ID.
	 *
	 * @param WC_Product $product WC_Product instance.
	 *
	 * @return int
	 */
	public static function get_default_product_id( $product ) {
		global $iconic_woothumbs_class;

		$caching_enabled    = $iconic_woothumbs_class->cache_class()::is_caching_enabled();
		$cache_key_name     = $iconic_woothumbs_class->cache_class()::get_cache_key_name( $product->get_id(), 'dvi' );
		$default_product_id = $iconic_woothumbs_class->cache_class()::get_cache_entry( $cache_key_name );

		if ( false === $default_product_id ) {
			$default_product_id = $product->get_id();

			if ( $product ) {
				$posted_variation_id = isset( $_REQUEST['variation_id'] ) ? absint( filter_var( wp_unslash( $_REQUEST['variation_id'] ), FILTER_SANITIZE_NUMBER_INT ) ) : 0;

				if ( $posted_variation_id ) {
					$default_product_id = $posted_variation_id;
				} else {
					if ( 'variable' === $product->get_type() ) {
						$default_attributes = Iconic_WooThumbs::get_variation_default_attributes( $product );

						if ( ! empty( $default_attributes ) ) {
							$variation_id = self::find_matching_product_variation( $product, $default_attributes );

							if ( ! empty( $variation_id ) ) {
								$default_product_id = $variation_id;
							}
						}
					}
				}
			}

			if ( $caching_enabled ) {
				$iconic_woothumbs_class->cache_class()::set_cache_entry( $cache_key_name, $default_product_id );
			}
		}

		/**
		 * Filter: iconic_woothumbs_default_product_id
		 *
		 * @filter iconic_woothumbs_default_product_id
		 * @since 5.0.0
		 * @param int        $id      Default product ID.
		 * @param WC_Product $product WC_Product object.
		 *
		 * @return int
		 */
		return apply_filters( 'iconic_woothumbs_default_product_id', absint( $default_product_id ), $product );
	}

	/**
	 * Get selected variation
	 *
	 * If the URL contains variation data, get the related variation ID,
	 * if it exists, and overwrite the current selected ID
	 *
	 * @param WC_Product_Variation $product WC_Product instance.
	 *
	 * @return int
	 */
	public static function get_selected_product_id( $product ) {
		global $iconic_woothumbs_class;

		$selected_product_id = self::get_default_product_id( $product );

		// If `variation_id` is set, `get_default_product_id()` will already return it.
		if ( $product->get_type() === 'variable' && ! isset( $_REQUEST['variation_id'] ) ) {
			$default_atts  = $iconic_woothumbs_class->get_default_atts( $selected_product_id );
			$selected_atts = wp_parse_args( $iconic_woothumbs_class->get_atts_from_query_string(), $default_atts );

			$selected_atts_count  = count( $selected_atts );
			$available_atts_count = count( $product->get_variation_attributes() );

			if ( ! empty( $selected_atts ) && $selected_atts_count === $available_atts_count ) {
				$variation = self::find_matching_product_variation( $product, $selected_atts );

				if ( $variation ) {
					$selected_product_id = $variation;
				}
			}
		}

		/**
		 * Filter: iconic_woothumbs_selected_product_id
		 *
		 * @filter iconic_woothumbs_default_product_id
		 * @since 5.0.0
		 * @param int        $id      Selected product ID.
		 * @param WC_Product $product WC_Product object.
		 *
		 * @return int
		 */
		return apply_filters( 'iconic_woothumbs_selected_product_id', $selected_product_id, $product );
	}
}
