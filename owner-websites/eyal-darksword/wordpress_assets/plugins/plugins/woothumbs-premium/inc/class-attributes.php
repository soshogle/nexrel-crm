<?php
/**
 * Attributes.
 *
 * @package iconic-woothumbs
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Iconic_WooThumbs_Images.
 */
class Iconic_WooThumbs_Attributes {
	/**
	 * Run.
	 */
	public static function run() {
		add_action( 'woocommerce_before_variations_form', array( __CLASS__, 'generate_attributes_data' ), 10 );
	}

	/**
	 * Output JSON data for attribute images.
	 */
	public static function generate_attributes_data() {
		global $iconic_woothumbs_class, $product;

		if ( ! $product || ! $product->is_type( 'variable' ) ) {
			return;
		}

		$product_id      = apply_filters( 'wpml_object_id', $product->get_id(), 'product', true, apply_filters( 'wpml_default_language', null ) );
		$attributes_data = get_post_meta( $product_id, '_iconic_woothumbs_ai', true );

		if ( ! $attributes_data ) {
			return;
		}

		$caching_enabled   = $iconic_woothumbs_class->cache_class()::is_caching_enabled();
		$cache_key_name    = $iconic_woothumbs_class->cache_class()::get_cache_key_name( $product_id, 'ai_images' );
		$attributes_images = ( $caching_enabled ) ? $iconic_woothumbs_class->cache_class()::get_cache_entry( $cache_key_name ) : array();

		if ( ! $caching_enabled || empty( $attributes_images ) ) {
			foreach ( $attributes_data as $attribute_name => $attribute_data ) {
				$attributes_images[ $attribute_name ] = array();

				if ( ! $attribute_data['terms'] ) {
					continue;
				}

				foreach ( $attribute_data['terms'] as $term_data ) {
					/**
					 * Filter: modify an individual AI term name for JavaScript consumption
					 * e.g. for translation when using a multi-lingual plugin such as WPML.
					 *
					 * @filter iconic_woothumbs_ai_js_term_name
					 * @since 5.1.2
					 * @param string $term_name      Term name e.g `Red`.
					 * @param string $attribute_name Attribute name e.g `pa_color`.
					 */
					$term_name = apply_filters_deprecated( 'iconic_woothumbs_ai_js_term_name', [ $term_data['term'], $attribute_name ], '5.13.0', 'iconic_woothumbs_ai_js_term_slug' );

					$term = get_term_by( 'name', $term_name, $attribute_name );

					$term_slug = is_a( $term, 'WP_Term' ) ? $term->slug : sanitize_title( $term_name );

					/**
					 * Filter: modify an individual AI term slug for JavaScript consumption
					 * e.g. for translation when using a multi-lingual plugin such as WPML.
					 *
					 * @filter iconic_woothumbs_ai_js_term_name
					 * @since 5.13.0
					 * @param string $term_slug      Term slug e.g `red`.
					 * @param string $term_name      Term name e.g `Red`.
					 * @param string $attribute_name Attribute name e.g `pa_color`.
					 */
					$term_slug = apply_filters( 'iconic_woothumbs_ai_js_term_slug', $term_slug, $attribute_name, $term_name, $term );

					if ( ! $term_data['term'] || ! $term_data['images'] ) {
						continue;
					}

					$image_ids = array_filter( wp_list_pluck( $term_data['images'], 'id' ) );

					if ( ! $image_ids ) {
						continue;
					}

					$images = Iconic_WooThumbs_Product::get_ai_images( $product_id, $image_ids );

					if ( ! $images ) {
						continue;
					}

					if ( $term_slug ) {
						// Term name is converted into a slug so that it matches the `select` value.
						$attributes_images[ $attribute_name ][ $term_slug ] = $images;
					}
				}
			}
		}

		if ( $caching_enabled ) {
			$iconic_woothumbs_class->cache_class()::set_cache_entry( $cache_key_name, $attributes_images );
		}
		?>
		<script>
			(function( $, document ) {
				window.iconic_woothumbs_attributes_data = <?php echo wp_json_encode( $attributes_images ); ?>;
			}( jQuery, document ));
		</script>
		<?php
	}

	/**
	 * Get attribute image IDs for a variation.
	 *
	 * @param object $product WC_Product instance.
	 *
	 * @return array
	 */
	public static function get_attribute_image_ids_for_variation( $product ) {
		$image_ids = array();

		$attributes_data = get_post_meta( $product->get_parent_id(), '_iconic_woothumbs_ai', true );

		if ( ! $attributes_data ) {
			return $image_ids;
		}

		$parent_product = wc_get_product( $product->get_parent_id() );

		if ( ! $parent_product ) {
			return $image_ids;
		}

		$default_attributes = $parent_product->get_default_attributes();

		if ( ! $default_attributes ) {
			return $image_ids;
		}

		// Get image IDs assigned to specific attributes.
		foreach ( $attributes_data as $attribute_slug => $attribute_data ) {
			if ( ! empty( $default_attributes[ $attribute_slug ] ) && ! empty( $attribute_data['terms'] ) ) {
				foreach ( $attribute_data['terms'] as $term_data ) {
					if (
						( sanitize_title( $term_data['term'] ) === $default_attributes[ $attribute_slug ] || 'Any' === $term_data['term'] ) &&
						! empty( $term_data['images'] )
					) {
						$image_ids = array_merge( $image_ids, array_column( $term_data['images'], 'id' ) );
					}
				}
			}
		}

		// Get image IDs assigned to all attributes.
		if ( ! empty( $attributes_data['all']['terms'][0]['images'] ) ) {
			$image_ids = array_merge( $image_ids, array_column( $attributes_data['all']['terms'][0]['images'], 'id' ) );
		}

		return $image_ids;
	}
}
