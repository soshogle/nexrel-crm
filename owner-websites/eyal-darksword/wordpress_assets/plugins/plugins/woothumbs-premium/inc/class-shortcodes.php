<?php
/**
 * Shortcodes.
 *
 * @package iconic-woothumbs
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Iconic_WooThumbs_Shortcodes.
 *
 * @class    Iconic_WooThumbs_Shortcodes
 * @version  1.0.0
 * @package  Iconic_WooThumbs
 */
class Iconic_WooThumbs_Shortcodes {
	/**
	 * Init shortcodes
	 */
	public static function run() {
		if ( is_admin() && ! wp_doing_ajax() ) {
			return;
		}

		add_shortcode( 'woothumbs-gallery', array( __CLASS__, 'gallery' ) );
	}

	/**
	 * Render the gallery shortcode.
	 *
	 * @param array $atts Shortcode attributes.
	 * @return void
	 */
	public static function gallery( $atts ) {
		global $post, $product, $iconic_woothumbs_class;

		$atts = shortcode_atts(
			array(
				'id'            => false,
				'gallery_align' => false,
				'gallery_width' => false,
			),
			$atts,
			'woothumbs-gallery'
		);

		if ( $atts['id'] ) {
			$atts['id'] = $atts['id'];
		} elseif ( $post && is_a( $post, 'WP_Post' ) ) {
			$atts['id'] = $post->ID;
		} elseif ( $product && is_a( $product, 'WC_Product' ) ) {
			$atts['id'] = $product->get_id();
		} else {
			// Caters for page builders that don't set/expose the $post object.
			$atts['id'] = false;
		}

		if ( ! $atts['id'] ) {
			return;
		}

		ob_start();

		$post_object = get_post( intval( $atts['id'] ) );

		if ( ! $post_object || $post_object->post_password ) {
			ob_end_clean();
			return;
		}

		$GLOBALS['post'] =& $post_object;

		setup_postdata( $GLOBALS['post'] );

		$iconic_woothumbs_class->show_product_images( $atts );

		wp_reset_postdata();

		return ob_get_clean();
	}
}
