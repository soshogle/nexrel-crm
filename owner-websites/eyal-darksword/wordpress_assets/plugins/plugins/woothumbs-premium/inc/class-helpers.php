<?php
/**
 * Helpers.
 *
 * @package iconic-woothumbs
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Iconic_WooThumbs_Helpers.
 *
 * @since 5.0.0
 */
class Iconic_WooThumbs_Helpers {
	/**
	 * Get the global aspect ratio.
	 *
	 * @see https://developer.mozilla.org/en-US/docs/Web/CSS/aspect-ratio#syntax
	 *
	 * @param string $size Image size: either `single` or `gallery_thumbnail`.
	 *
	 * @return string
	 */
	public static function get_global_aspect_ratio( $size = 'single' ) {
		$ratio = Iconic_WooThumbs_Images::get_image_crop( $size );
		$ratio = ( $ratio && is_array( $ratio ) && count( $ratio ) === 2 ) ? implode( ':', $ratio ) : '';

		// Enforce a sensible ratio when cropping settings
		// are configured to favour portrait images.
		if ( '100:0' === $ratio ) {
			$ratio = '2:3';
		}

		return $ratio;
	}

	/**
	 * Extract the product ID from the WC single product block.
	 *
	 * @param WP_Post $post WP_Post object instance.
	 * 
	 * @return bool|int
	 */
	public static function get_single_product_block_product_id( $post ) {
		$product_id = false;

		if ( $post && has_block( 'woocommerce/single-product', $post ) ) {
			foreach( parse_blocks( $post->post_content ) as $block ) {
				if ( 
					'woocommerce/single-product' === $block['blockName'] &&
					! empty( $block['attrs']['productId'] )
				) {
					$product_id = absint( $block['attrs']['productId'] );
					break;
				}
			}
		}

		return $product_id;
	}
}


